module.exports = {
  packagerConfig: {
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
      // Runtime only needs build/Release/ and index.js; strip everything else.
      /native\/discord\/(src|include|lib|scripts|node_modules|binding\.gyp|package\.json)/,
      /native\/discord\/build\/Release\/obj\.target/,
      /native\/discord\/build\/Release\/\.deps/,
    ],
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
