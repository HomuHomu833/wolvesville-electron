module.exports = {
  packagerConfig: {
    // Unpack the whole addon output dir. This MUST include the Discord SDK shared
    // library (.so/.dylib/.dll) — the .node links against it via rpath, so it has
    // to be a real file next to the .node, not sealed inside app.asar. We do NOT
    // use plugin-auto-unpack-natives because it forces unpack to **/*.node only,
    // which would leave the SDK lib trapped in the asar and break loading.
    asar: {
      unpack: '{**/native/discord/build/Release/discord_addon.node,**/native/discord/build/Release/*.so,**/native/discord/build/Release/*.dylib,**/native/discord/build/Release/*.dll}',
    },
    icon: './src/icons/icon',
    name: 'Wolvesville',
    ignore: [
      /node_modules\/(?!(electron-squirrel-startup))/,
      /\.yarn/,
      /\.idea/,
      /\.git/,
      /out/,
      // Strip Discord addon build sources and vendored dev-only artifacts.
      // The runtime only needs native/discord/build/Release/ and native/discord/index.js.
      /native\/discord\/(src|include|lib|scripts|node_modules|binding\.gyp|package\.json)/,
      // Intermediate node-gyp build junk (duplicate .node, object files).
      /native\/discord\/build\/Release\/obj\.target/,
      /native\/discord\/build\/Release\/\.deps/,
    ],
    // No Apple Developer signing/notarization for the community build — CI has no
    // certs, so @electron/packager just ad-hoc signs (required for arm64 to run).
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [],
}
