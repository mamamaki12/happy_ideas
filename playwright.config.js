import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    // カメラ・マイクは偽デバイス、位置情報は東京駅に固定
    permissions: ['camera', 'microphone', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-write'],
    geolocation: { latitude: 35.681236, longitude: 139.767125, accuracy: 10 },
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
