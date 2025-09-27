import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function signalReady() {
  window.dispatchEvent(new Event('AnatalebReady'));
}

bootstrapApplication(App, appConfig)
  .then(signalReady)
  .catch(err => {
    console.error('❌ Bootstrap failed:', err);
    signalReady(); // reveal the UI so you can see the error/toast
  });
