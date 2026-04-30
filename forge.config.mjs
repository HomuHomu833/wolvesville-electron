export default {
  packagerConfig: {
    asar: true,
    icon: './src/icons/icon',
    name: 'Wolvesville',
    executableName: 'wolvesville',
    appVersion: '1.0.1',
    ignore: [/^\/node_modules\/.bin/, /^\/\.git/, /README/i],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Wolvesville',
        setupExe: 'WollesvilleSetup.exe',
        setupIcon: './src/icons/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'wolvesville',
          productName: 'Wolvesville',
          maintainer: 'HomuHomu833',
          homepage: 'https://www.wolvesville.com',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'wolvesville',
          productName: 'Wolvesville',
          maintainer: 'HomuHomu833',
          homepage: 'https://www.wolvesville.com',
        },
      },
    },
  ],
  plugins: [
    { name: '@electron-forge/plugin-auto-unpack-natives', config: {} },
  ],
};
