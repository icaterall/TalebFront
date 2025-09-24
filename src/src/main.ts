import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).then(() => {
  window.dispatchEvent(new Event('AnatalebReady'));
});