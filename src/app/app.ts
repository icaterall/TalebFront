import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('anataleb-frontend');
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    console.time('appInit-full');
    
    // Safety timeout to prevent infinite hanging
    setTimeout(() => {
      if (!window['anatalebReadySent']) {
        console.warn('⚠️ Safety timeout reached, forcing app reveal');
        window['anatalebReadySent'] = true;
        window.dispatchEvent(new Event('AnatalebReady'));
      }
    }, 6000);
    
    // Only dispatch AnatalebReady after the first navigation completes AND content is rendered
    if (this.isBrowser) {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          take(1) // Only take the first navigation
        )
        .subscribe({
          next: () => {
            console.time('appInit-navigation');
            // Use requestAnimationFrame to wait for the browser to paint
            requestAnimationFrame(() => {
              // Double RAF to ensure content is actually painted
              requestAnimationFrame(() => {
                // Additional delay to ensure lazy-loaded components are fully rendered
                setTimeout(() => {
                  console.log('✅ Dispatching AnatalebReady event');
                  console.timeEnd('appInit-navigation');
                  console.timeEnd('appInit-full');
                  
                  if (!window['anatalebReadySent']) {
                    window['anatalebReadySent'] = true;
                    window.dispatchEvent(new Event('AnatalebReady'));
                  }
                }, 800); // Increased delay to show loading spinner longer
              });
            });
          },
          error: (err) => {
            console.error('❌ Router error:', err);
            // Force app reveal on error
            if (!window['anatalebReadySent']) {
              window['anatalebReadySent'] = true;
              window.dispatchEvent(new Event('AnatalebReady'));
            }
          }
        });
    }
  }
}
