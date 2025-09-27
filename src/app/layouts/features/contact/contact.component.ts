// src/app/contact/contact.component.ts
import {
  Component, OnInit, Inject, PLATFORM_ID, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha-2';
import { ContactService } from './contact.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule, RecaptchaV3Module],
})
export class ContactComponent implements OnInit {
  loadingSubmit = false;
  private lastSubmitAt = 0;
  private readonly minSubmitIntervalMs = 4000; // client-side throttle
  private readonly action = 'contact_form';

  // simple honeypot model (bind it in template)
  botField = '';

  constructor(
    private recaptchaV3: ReCaptchaV3Service,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(ToastrService) private toastr: ToastrService,
    public translate: TranslateService,
    private contactService: ContactService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  onSubmit(form: NgForm): void {
    const isRtl = document.documentElement.dir === 'rtl';

    // 1) Basic client validations (trim + length limits mirror DB)
    const name    = String(form.value.name ?? '').trim();
    const email   = String(form.value.email ?? '').trim();
    const subject = String(form.value.subject ?? '').trim();
    const message = String(form.value.comments ?? '').trim();

    if (!name || !email || !subject || !message) {
      this.toastErr('forms.fill-all-fields', 'forms.form-incomplete', isRtl);
      return;
    }
    if (name.length > 200 || subject.length > 255 || message.length > 1000) {
      this.toastErr('general.error', 'forms.form-incomplete', isRtl,
        this.translate.instant('contactForm.tooLong') || 'Input too long');
      return;
    }
    // light email check (don’t overdo it client-side)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      this.toastErr('general.error', 'forms.form-incomplete', isRtl,
        this.translate.instant('contactForm.badEmail') || 'Invalid email');
      return;
    }

    // 2) Honeypot (bots tend to fill hidden fields)
    if (this.botField) {
      // Pretend success to not help bots probe the form
      form.resetForm();
      this.toastOk(isRtl);
      return;
    }

    // 3) Throttle rapid submissions
    const now = Date.now();
    if (now - this.lastSubmitAt < this.minSubmitIntervalMs) return;
    this.lastSubmitAt = now;

    // 4) SSR safety
    if (!isPlatformBrowser(this.platformId)) return;

    // 5) Execute v3 and submit
    this.loadingSubmit = true; this.cdr.markForCheck();
    this.recaptchaV3.execute(this.action).subscribe({
      next: (token: string) => {
        this.contactService.sendMessage({
          name, email, subject, message,
          recaptchaToken: token,
          recaptchaAction: this.action
        }).subscribe({
          next: (res) => {
            this.loadingSubmit = false; this.cdr.markForCheck();
            form.resetForm();
            this.toastOk(isRtl);
          },
          error: (err) => {
            console.log(err);
            this.loadingSubmit = false; this.cdr.markForCheck();
            const key = err?.message ? err.message : 'general.error';
            this.toastErr(key, 'general.error', isRtl);
          }
        });
      },
      error: () => {
        this.loadingSubmit = false; this.cdr.markForCheck();
        this.toastErr('contactForm.recaptchaFail', 'general.error', isRtl);
      }
    });
  }

  private toastOk(isRtl: boolean) {
    this.toastr.success(
      this.translate.instant('contactForm.sentOk', { default: 'Message sent. Thank you!' }),
      this.translate.instant('general.success', { default: 'Success' }),
      { positionClass: isRtl ? 'toast-top-left' : 'toast-top-right' }
    );
  }

  private toastErr(msgKey: string, titleKey: string, isRtl: boolean, msgOverride?: string) {
    this.toastr.error(
      msgOverride ?? this.translate.instant(msgKey),
      this.translate.instant(titleKey),
      { positionClass: isRtl ? 'toast-top-left' : 'toast-top-right' }
    );
  }
}
