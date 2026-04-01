// ═══════════════════════════════════════════════════════════════════════════
// FILE: babel.config.js
// UPDATED - Added react-native-dotenv plugin
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@atoms': './src/components/atoms',
          '@molecules': './src/components/molecules',
          '@organisms': './src/components/organisms',
          '@templates': './src/components/templates',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@services': './src/services',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@types': './src/types',
          '@theme': './src/theme',
          '@assets': './src/assets',
        },
      },
    ],
    // ✅ NEW: Add this plugin to load .env files
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};