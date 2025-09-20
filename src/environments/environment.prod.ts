export const environment = {
  production: true,
  hmr: false,
  frontendUrl:"https://anataleb.com",
  apiUrl:"https://backend.anataleb.com/api/v1",
  apiSocketUrl:"https://backend.anataleb.com/",
  apiDirectUrl:"https://backend.anataleb.com/",
  apiUploadUrl:"https://anataleb.s3.us-east-2.amazonaws.com/",
  enableServiceWorker: false,
  enableAnalytics: false,
    cacheTimeout: 300000, // 5 minutes in milliseconds
 imageOptimization: {
    lazy: true,
    formats: ['webp', 'jpg'],
    sizes: '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
  }
};