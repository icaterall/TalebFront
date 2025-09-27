export const environment = {
  production: true,
  hmr: false,
  frontendUrl:"https://anataleb.com",
  apiUrl:"https://backtest.anataleb.com/api/v1",
  apiSocketUrl:"https://backtest.anataleb.com/",
  apiDirectUrl:"https://backtest.anataleb.com/",
  apiUploadUrl:"https://anataleb.s3.us-east-2.amazonaws.com/",
  recaptchaSiteKey: '6Le_ytYrAAAAAPtWAIltkJkF4ijMK3jpGVQUEtQ-',
  enableServiceWorker: false,
  enableAnalytics: false,
    cacheTimeout: 300000, // 5 minutes in milliseconds
 imageOptimization: {
    lazy: true,
    formats: ['webp', 'jpg'],
    sizes: '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
  }
};