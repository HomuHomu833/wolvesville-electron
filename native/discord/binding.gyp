{
  "targets": [
    {
      "target_name": "discord_addon",
      "sources": ["src/discord_addon.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "include"
      ],
      "defines": ["NAPI_CPP_EXCEPTIONS", "NAPI_VERSION=8"],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "conditions": [
        ["OS=='win'", {
          "libraries": ["<(module_root_dir)/lib/win32/x64/discord_partner_sdk.lib"],
          "copies": [{
            "destination": "<(module_root_dir)/build/Release",
            "files": ["<(module_root_dir)/lib/win32/x64/discord_partner_sdk.dll"]
          }],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS=='mac'", {
          "libraries": ["<(module_root_dir)/lib/darwin/libdiscord_partner_sdk.dylib"],
          "copies": [{
            "destination": "<(module_root_dir)/build/Release",
            "files": ["<(module_root_dir)/lib/darwin/libdiscord_partner_sdk.dylib"]
          }],
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "11.0",
            "OTHER_LDFLAGS": ["-Wl,-rpath,@loader_path"]
          }
        }],
        ["OS=='linux'", {
          "libraries": ["<(module_root_dir)/lib/linux/x64/libdiscord_partner_sdk.so"],
          "copies": [{
            "destination": "<(module_root_dir)/build/Release",
            "files": ["<(module_root_dir)/lib/linux/x64/libdiscord_partner_sdk.so"]
          }],
          "cflags_cc": ["-std=c++17", "-fexceptions"],
          "ldflags": ["-Wl,-rpath,'$$ORIGIN'"]
        }]
      ]
    }
  ]
}
