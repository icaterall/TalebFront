export const environment = {
  production: false,
  hmr: false, 
  frontendUrl:"http://localhost:4200",
  apiUrl:"http://127.0.0.1:3000/api/v1",
  apiDirectUrl:"http://127.0.0.1:3000/",
  apiUploadUrl:"https://pickpickgo.s3.ap-southeast-1.amazonaws.com",
   apiSocketUrl:"http://127.0.0.1:3000/",
  enableServiceWorker: false,
  enableAnalytics: false,
    cacheTimeout: 300000, // 5 minutes in milliseconds
 imageOptimization: {
    lazy: true,
    formats: ['webp', 'jpg'],
    sizes: '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
  }
};
