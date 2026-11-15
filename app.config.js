const brand = require('./brand.json');

module.exports = ({ config }) => ({
  ...config,
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  plugins: [
    ...(config.plugins || []),
    'expo-font',
  ],
  ios: { ...config.ios, bundleIdentifier: brand.package },
  android: { ...config.android, package: brand.package },
});
