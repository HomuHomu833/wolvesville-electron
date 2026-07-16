// Electron entry point for the inlined Discord Social SDK addon.
// Loads the compiled native addon. Falls back to no-ops if loading
// fails (e.g. during CI on a platform without the SDK binaries).

let discord;

try {
  discord = require('./build/Release/discord_addon.node');
} catch (e) {
  console.warn('Discord Social SDK: Failed to load native addon:', e.message);
  discord = {
    initialize: () => false,
    connect: () => false,
    runCallbacks: () => {},
    getStatus: () => -1,
    shutdown: () => {},
    updatePresence: () => false,
    sendInvite: () => false,
    setActivityJoinCallback: () => false,
    updateToken: (token, cb) => { if (cb) cb(null); },
    isAuthenticated: () => false,
    setTokenExpirationCallback: () => false,
    setStatusChangedCallback: () => false,
    getRelationships: () => [],
    registerLaunchSteamApplication: () => false,
  };
}

discord.Status = {
  Disconnected: 0,
  Connecting: 1,
  Connected: 2,
  Ready: 3,
  Reconnecting: 4,
};

discord.Platform = {
  Desktop: 1,
  Xbox: 2,
  Samsung: 4,
  iOS: 8,
  Android: 16,
  Embedded: 32,
  PS4: 64,
  PS5: 128,
};

module.exports = discord;
