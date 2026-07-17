// N-API binding for the Discord Social SDK (discordpp), reconstructed to match
// the JS surface used by main.js / preload.js. Built with node-addon-api, so the
// resulting .node is ABI-stable N-API and loads in Electron without a rebuild.
//
// Threading note: the Discord SDK invokes all of its callbacks synchronously
// from within discordpp::RunCallbacks(). main.js drives that on the main thread
// via setInterval, so every SDK callback also runs on the main thread with a
// live HandleScope. That means we can call back into JS directly and never need
// a ThreadSafeFunction here.

#include <napi.h>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>

// discordpp.h is a single-header SDK: exactly one translation unit must define
// DISCORDPP_IMPLEMENTATION to emit the method bodies. This is that unit.
#define DISCORDPP_IMPLEMENTATION
#include "discordpp.h"

namespace {

std::shared_ptr<discordpp::Client> g_client;
bool g_authed = false;

// Persistent references to the JS callbacks the game registers. They are invoked
// from inside RunCallbacks(), i.e. on the main thread.
Napi::FunctionReference g_onStatusChanged;
Napi::FunctionReference g_onActivityJoin;
Napi::FunctionReference g_onTokenExpired;

// Discord snowflake IDs exceed 2^53, so they arrive/leave as strings.
uint64_t ToU64(const Napi::Value& v) {
  if (v.IsString()) {
    try {
      return std::stoull(v.As<Napi::String>().Utf8Value());
    } catch (...) {
      return 0;
    }
  }
  if (v.IsBigInt()) {
    bool lossless = false;
    return v.As<Napi::BigInt>().Uint64Value(&lossless);
  }
  if (v.IsNumber()) {
    return static_cast<uint64_t>(v.As<Napi::Number>().Int64Value());
  }
  return 0;
}

std::string GetString(const Napi::Object& o, const char* key) {
  if (!o.Has(key)) return "";
  Napi::Value v = o.Get(key);
  return v.IsString() ? v.As<Napi::String>().Utf8Value() : "";
}

bool HasString(const Napi::Object& o, const char* key) {
  return o.Has(key) && o.Get(key).IsString();
}

void SafeCall(Napi::FunctionReference& ref, const std::initializer_list<napi_value>& args) {
  if (ref.IsEmpty()) return;
  try {
    ref.Call(args);
  } catch (const Napi::Error&) {
    // Swallow JS errors so they never unwind into the SDK's C++ frames.
  }
}

// ---- Exposed functions ------------------------------------------------------

Napi::Value Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) return Napi::Boolean::New(env, false);

  uint64_t appId = ToU64(info[0]);
  if (appId == 0) return Napi::Boolean::New(env, false);

  try {
    g_client = std::make_shared<discordpp::Client>();
    g_client->SetApplicationId(appId);
    g_authed = false;
    return Napi::Boolean::New(env, true);
  } catch (...) {
    g_client.reset();
    return Napi::Boolean::New(env, false);
  }
}

Napi::Value Connect(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_client) return Napi::Boolean::New(env, false);
  g_client->Connect();
  return Napi::Boolean::New(env, true);
}

Napi::Value RunCallbacks(const Napi::CallbackInfo& info) {
  discordpp::RunCallbacks();
  return info.Env().Undefined();
}

Napi::Value GetStatus(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_client) return Napi::Number::New(env, -1);
  return Napi::Number::New(env, static_cast<int>(g_client->GetStatus()));
}

Napi::Value Shutdown(const Napi::CallbackInfo& info) {
  if (g_client) {
    try {
      g_client->Disconnect();
    } catch (...) {
    }
    g_client.reset();
  }
  g_authed = false;
  return info.Env().Undefined();
}

Napi::Value IsAuthenticated(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), g_authed);
}

Napi::Value UpdatePresence(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_client) return Napi::Boolean::New(env, false);
  if (info.Length() < 1 || !info[0].IsObject()) {
    // Empty presence clears rich presence.
    g_client->UpdateRichPresence(discordpp::Activity{}, [](discordpp::ClientResult) {});
    return Napi::Boolean::New(env, true);
  }

  Napi::Object p = info[0].As<Napi::Object>();
  discordpp::Activity activity;

  if (p.Has("type") && p.Get("type").IsNumber()) {
    activity.SetType(static_cast<discordpp::ActivityTypes>(p.Get("type").As<Napi::Number>().Int32Value()));
  }
  if (HasString(p, "state")) activity.SetState(GetString(p, "state"));
  if (HasString(p, "details")) activity.SetDetails(GetString(p, "details"));

  if (p.Has("timestamps") && p.Get("timestamps").IsObject()) {
    Napi::Object t = p.Get("timestamps").As<Napi::Object>();
    discordpp::ActivityTimestamps ts;
    if (t.Has("start") && t.Get("start").IsNumber())
      ts.SetStart(static_cast<uint64_t>(t.Get("start").As<Napi::Number>().Int64Value()));
    if (t.Has("end") && t.Get("end").IsNumber())
      ts.SetEnd(static_cast<uint64_t>(t.Get("end").As<Napi::Number>().Int64Value()));
    activity.SetTimestamps(ts);
  }

  if (p.Has("assets") && p.Get("assets").IsObject()) {
    Napi::Object a = p.Get("assets").As<Napi::Object>();
    discordpp::ActivityAssets assets;
    if (HasString(a, "largeImage")) assets.SetLargeImage(GetString(a, "largeImage"));
    if (HasString(a, "largeText")) assets.SetLargeText(GetString(a, "largeText"));
    if (HasString(a, "smallImage")) assets.SetSmallImage(GetString(a, "smallImage"));
    if (HasString(a, "smallText")) assets.SetSmallText(GetString(a, "smallText"));
    activity.SetAssets(assets);
  }

  if (p.Has("party") && p.Get("party").IsObject()) {
    Napi::Object pt = p.Get("party").As<Napi::Object>();
    discordpp::ActivityParty party;
    if (HasString(pt, "id")) party.SetId(GetString(pt, "id"));
    // Accept either {size:[cur,max]} or {currentSize,maxSize}.
    if (pt.Has("size") && pt.Get("size").IsArray()) {
      Napi::Array sz = pt.Get("size").As<Napi::Array>();
      if (sz.Length() >= 1 && sz.Get((uint32_t)0).IsNumber())
        party.SetCurrentSize(sz.Get((uint32_t)0).As<Napi::Number>().Int32Value());
      if (sz.Length() >= 2 && sz.Get((uint32_t)1).IsNumber())
        party.SetMaxSize(sz.Get((uint32_t)1).As<Napi::Number>().Int32Value());
    } else {
      if (pt.Has("currentSize") && pt.Get("currentSize").IsNumber())
        party.SetCurrentSize(pt.Get("currentSize").As<Napi::Number>().Int32Value());
      if (pt.Has("maxSize") && pt.Get("maxSize").IsNumber())
        party.SetMaxSize(pt.Get("maxSize").As<Napi::Number>().Int32Value());
    }
    activity.SetParty(party);
  }

  if (p.Has("secrets") && p.Get("secrets").IsObject()) {
    Napi::Object s = p.Get("secrets").As<Napi::Object>();
    discordpp::ActivitySecrets secrets;
    if (HasString(s, "join")) secrets.SetJoin(GetString(s, "join"));
    activity.SetSecrets(secrets);
  }

  g_client->UpdateRichPresence(std::move(activity), [](discordpp::ClientResult) {});
  return Napi::Boolean::New(env, true);
}

Napi::Value SendInvite(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_client || info.Length() < 1) return Napi::Boolean::New(env, false);
  uint64_t userId = ToU64(info[0]);
  std::string content = (info.Length() >= 2 && info[1].IsString())
                            ? info[1].As<Napi::String>().Utf8Value()
                            : "";
  g_client->SendActivityInvite(userId, content, [](discordpp::ClientResult) {});
  return Napi::Boolean::New(env, true);
}

Napi::Value SetActivityJoinCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() >= 1 && info[0].IsFunction()) {
    g_onActivityJoin = Napi::Persistent(info[0].As<Napi::Function>());
  }
  if (!g_client) return Napi::Boolean::New(env, false);
  g_client->SetActivityJoinCallback([](std::string joinSecret) {
    if (g_onActivityJoin.IsEmpty()) return;
    Napi::Env e = g_onActivityJoin.Env();
    Napi::HandleScope scope(e);
    SafeCall(g_onActivityJoin, {Napi::String::New(e, joinSecret)});
  });
  return Napi::Boolean::New(env, true);
}

Napi::Value SetStatusChangedCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() >= 1 && info[0].IsFunction()) {
    g_onStatusChanged = Napi::Persistent(info[0].As<Napi::Function>());
  }
  if (!g_client) return Napi::Boolean::New(env, false);
  g_client->SetStatusChangedCallback(
      [](discordpp::Client::Status status, discordpp::Client::Error, int32_t) {
        if (g_onStatusChanged.IsEmpty()) return;
        Napi::Env e = g_onStatusChanged.Env();
        Napi::HandleScope scope(e);
        SafeCall(g_onStatusChanged, {Napi::Number::New(e, static_cast<int>(status))});
      });
  return Napi::Boolean::New(env, true);
}

Napi::Value SetTokenExpirationCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() >= 1 && info[0].IsFunction()) {
    g_onTokenExpired = Napi::Persistent(info[0].As<Napi::Function>());
  }
  if (!g_client) return Napi::Boolean::New(env, false);
  g_client->SetTokenExpirationCallback([]() {
    g_authed = false;
    if (g_onTokenExpired.IsEmpty()) return;
    Napi::Env e = g_onTokenExpired.Env();
    Napi::HandleScope scope(e);
    SafeCall(g_onTokenExpired, {});
  });
  return Napi::Boolean::New(env, true);
}

// updateToken(token, cb) — cb is a Node-style (err) callback, matching main.js.
Napi::Value UpdateToken(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    return Napi::Boolean::New(env, false);
  }
  std::string token = info[0].As<Napi::String>().Utf8Value();

  auto cb = std::make_shared<Napi::FunctionReference>();
  if (info.Length() >= 2 && info[1].IsFunction()) {
    *cb = Napi::Persistent(info[1].As<Napi::Function>());
  }

  if (!g_client) {
    if (!cb->IsEmpty()) {
      SafeCall(*cb, {Napi::String::New(env, "DISCORD_NOT_INITIALIZED")});
    }
    return Napi::Boolean::New(env, false);
  }

  g_client->UpdateToken(
      discordpp::AuthorizationTokenType::Bearer, token,
      [cb](discordpp::ClientResult result) {
        bool ok = result.Successful();
        g_authed = ok;
        if (cb->IsEmpty()) return;
        Napi::Env e = cb->Env();
        Napi::HandleScope scope(e);
        if (ok) {
          SafeCall(*cb, {e.Null()});
        } else {
          SafeCall(*cb, {Napi::String::New(e, result.Error())});
        }
      });
  return Napi::Boolean::New(env, true);
}

Napi::Value GetRelationships(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array out = Napi::Array::New(env);
  if (!g_client) return out;

  auto rels = g_client->GetRelationships();
  uint32_t i = 0;
  for (auto& r : rels) {
    Napi::Object o = Napi::Object::New(env);
    o.Set("id", Napi::String::New(env, std::to_string(r.Id())));
    o.Set("type", Napi::Number::New(env, static_cast<int>(r.DiscordRelationshipType())));
    o.Set("gameType", Napi::Number::New(env, static_cast<int>(r.GameRelationshipType())));

    auto user = r.User();
    if (user.has_value()) {
      Napi::Object u = Napi::Object::New(env);
      u.Set("id", Napi::String::New(env, std::to_string(user->Id())));
      u.Set("username", Napi::String::New(env, user->Username()));
      u.Set("displayName", Napi::String::New(env, user->DisplayName()));
      auto avatar = user->Avatar();
      if (avatar.has_value()) u.Set("avatar", Napi::String::New(env, *avatar));
      o.Set("user", u);
    }
    out.Set(i++, o);
  }
  return out;
}

Napi::Value RegisterLaunchSteamApplication(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_client || info.Length() < 2) return Napi::Boolean::New(env, false);
  uint64_t appId = ToU64(info[0]);
  uint32_t steamAppId = static_cast<uint32_t>(ToU64(info[1]));
  bool ok = g_client->RegisterLaunchSteamApplication(appId, steamAppId);
  return Napi::Boolean::New(env, ok);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("initialize", Napi::Function::New(env, Initialize));
  exports.Set("connect", Napi::Function::New(env, Connect));
  exports.Set("runCallbacks", Napi::Function::New(env, RunCallbacks));
  exports.Set("getStatus", Napi::Function::New(env, GetStatus));
  exports.Set("shutdown", Napi::Function::New(env, Shutdown));
  exports.Set("isAuthenticated", Napi::Function::New(env, IsAuthenticated));
  exports.Set("updatePresence", Napi::Function::New(env, UpdatePresence));
  exports.Set("sendInvite", Napi::Function::New(env, SendInvite));
  exports.Set("setActivityJoinCallback", Napi::Function::New(env, SetActivityJoinCallback));
  exports.Set("setStatusChangedCallback", Napi::Function::New(env, SetStatusChangedCallback));
  exports.Set("setTokenExpirationCallback", Napi::Function::New(env, SetTokenExpirationCallback));
  exports.Set("updateToken", Napi::Function::New(env, UpdateToken));
  exports.Set("getRelationships", Napi::Function::New(env, GetRelationships));
  exports.Set("registerLaunchSteamApplication", Napi::Function::New(env, RegisterLaunchSteamApplication));
  return exports;
}

}  // namespace

NODE_API_MODULE(discord_addon, Init)
