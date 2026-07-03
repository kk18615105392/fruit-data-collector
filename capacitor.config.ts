import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fruitdata.collector',
  appName: '热带水果采集',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Camera: {
      saveToGallery: false,
    },
  },
};

export default config;
