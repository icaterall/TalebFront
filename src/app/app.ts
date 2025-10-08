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
    // Only dispatch AnatalebReady after the first navigation completes
    if (this.isBrowser) {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          take(1) // Only take the first navigation
        )
        .subscribe(() => {
          // Small delay to ensure content is rendered
          setTimeout(() => {
            window.dispatchEvent(new Event('AnatalebReady'));
          }, 100);
        });
    }
  }
}
