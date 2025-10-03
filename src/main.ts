import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch(err => {
    console.error('❌ Bootstrap failed:', err);
    // Signal ready even on error so user can see the error
    window.dispatchEvent(new Event('AnatalebReady'));
  });
