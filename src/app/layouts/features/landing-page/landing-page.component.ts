import { Component, inject, Renderer2, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT, DecimalPipe, CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { TranslateService, TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../shared/header/header.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { ContactComponent } from '../contact/contact.component';
import { AuthService } from '../../../core/services/auth.service';


type Lang = 'ar' | 'en';

@Component({
  selector: 'app-landing-page',
  standalone: true,
 imports: [
  CommonModule,
  ContactComponent,
  TranslateModule,
  RouterModule,
  HeaderComponent,
  FooterComponent
],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit {
  private translate = inject(TranslateService);
  private renderer = inject(Renderer2);
  private auth = inject(AuthService);
  private router = inject(Router);
  constructor(@Inject(PLATFORM_ID) private platformId: object, @Inject(DOCUMENT) private doc: Document) {}
  isMenuOpen = false;
  private MOBILE_BP = 1060;
  currentLang: Lang = 'ar';
  partners = ['partner-1.svg', 'partner-2.svg', 'partner-3.svg', 'partner-4.svg', 'partner-5.svg'];
  
  // Updated with more detail for course cards
  courses = [
    { img: 'card-1.svg', titleKey: 'courses.c1.title', authorKey: 'courses.c1.author', rating: 4.5, reviews: 1254, price: 89.99 },
    { img: 'card-2.svg', titleKey: 'courses.c2.title', authorKey: 'courses.c2.author', rating: 4.7, reviews: 3489, price: 129.99 },
    { img: 'card-3.svg', titleKey: 'courses.c3.title', authorKey: 'courses.c3.author', rating: 4.2, reviews: 982, price: 59.99 },
    { img: 'card-4.svg', titleKey: 'courses.c4.title', authorKey: 'courses.c4.author', rating: 4.9, reviews: 5012, price: 199.99 },
  ];

  // Updated with icons
  features = [
    { icon: 'bi-bank', titleKey: 'features.institutions.title', descKey: 'features.institutions.desc' },
    { icon: 'bi-person-video3', titleKey: 'features.teachers.title', descKey: 'features.teachers.desc' },
    { icon: 'bi-mortarboard', titleKey: 'features.students.title', descKey: 'features.students.desc' },
    { icon: 'bi-people', titleKey: 'features.parents.title', descKey: 'features.parents.desc' },
  ];

  ngOnInit(): void {
    this.setLang((this.translate.currentLang as Lang) || 'ar');

    // If user is already logged in but has no role yet, redirect to account-type
    if (this.auth.isAuthenticated() && this.auth.needsRoleSelection()) {
      this.router.navigate(['/account-type']);
      return;
    }
  }

  toggleMobileMenu(){
    this.isMenuOpen = !this.isMenuOpen;
    this.isMenuOpen ? this.renderer.addClass(this.doc.body, 'no-scroll')
                    : this.renderer.removeClass(this.doc.body, 'no-scroll');
  }
  closeMobileMenu(){
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this.renderer.removeClass(this.doc.body, 'no-scroll');
  }

  @HostListener('window:resize')
  onResize(){
    if (isPlatformBrowser(this.platformId) && window.innerWidth > this.MOBILE_BP) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(){ this.closeMobileMenu(); }


onJoinFree() {
  // Navigate to signup
  if (isPlatformBrowser(this.platformId)) {
    window.location.href = '/signup';
  }
}
  setLang(lang: Lang) {
    this.currentLang = lang;
    this.translate.use(lang);
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