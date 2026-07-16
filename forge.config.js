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
    osxSign: {
      optionsForFile: () => ({
        entitlements: './entitlements.plist',
      }),
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
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
