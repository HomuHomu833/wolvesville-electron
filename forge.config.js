module.exports = {
  packagerConfig: {
    asar: {
      unpack: '{**/native/discord/build/Release/**}',
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
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
}
