const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
// Always run the react-native-maps config plugin so Apple Maps works without a
// key and the native module is configured consistently. A Google key is
// injected when supplied (Android still requires one for its Google basemap).
const mapsPlugin = [['react-native-maps', mapsKey ? { androidGoogleMapsApiKey: mapsKey, iosGoogleMapsApiKey: mapsKey } : {}]];

module.exports = {
  expo: {
    name: 'Naseem Bahrain',
    slug: 'ridewind-bahrain',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    ios: { supportsTablet: true, bundleIdentifier: 'com.ridewind.bahrain' },
    android: {
      adaptiveIcon: { backgroundColor: '#E6F4FE', foregroundImage: './assets/android-icon-foreground.png', backgroundImage: './assets/android-icon-background.png', monochromeImage: './assets/android-icon-monochrome.png' },
      predictiveBackGestureEnabled: false,
      package: 'com.ridewind.bahrain',
    },
    plugins: [
      'expo-font',
      'expo-sharing',
      ['expo-location', { locationWhenInUsePermission: 'Naseem uses your location only during an active ride to update conditions along your selected route.' }],
      ...mapsPlugin,
    ],
    web: { favicon: './assets/favicon.png' },
  },
};
