import { Component, inject, Renderer2, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit {
  private translate = inject(TranslateService);
  private renderer = inject(Renderer2);

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  currentLang: 'ar' | 'en' = 'ar';

  ngOnInit(): void {
    this.setLang((this.translate.currentLang as 'ar' | 'en') || 'ar');
  }

  setLang(lang: 'ar' | 'en') {
    this.currentLang = lang;
    this.translate.use(lang);

    // Only touch the DOM in the browser
    if (isPlatformBrowser(this.platformId)) {
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      this.renderer.setAttribute(this.doc.documentElement, 'lang', lang);
      this.renderer.setAttribute(this.doc.documentElement, 'dir', dir);
      if (dir === 'rtl') {
        this.renderer.addClass(this.doc.body, 'rtl');
      } else {
        this.renderer.removeClass(this.doc.body, 'rtl');
      }
    }
  }
}
