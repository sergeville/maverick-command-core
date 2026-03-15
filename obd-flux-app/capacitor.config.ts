import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maverick.obdflux',
  appName: 'OBD Flux Console',
  webDir: 'out',
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for OBD-II adapter…',
        cancel: 'Cancel',
        availableDevices: 'Available Adapters',
        noDeviceFound: 'No OBD-II BLE adapter found.',
      },
    },
  },
  ios: {
    // Build with: npx cap add ios && npx cap open ios
    // Add required plist keys — see README.md
  },
};

export default config;
