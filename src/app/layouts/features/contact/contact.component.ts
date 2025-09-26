// contact.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ContactMessage, ContactService } from './contact.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  standalone: true,                          // ✅ make it standalone
  imports: [CommonModule, FormsModule, TranslateModule], // ✅ translate pipe + ngModel
})
export class ContactComponent implements OnInit {
  loadingSubmit = false;

  constructor(
    // If you previously got DI token errors, keeping @Inject is bullet-proof:
    @Inject(ToastrService) private toastr: ToastrService,
    public translate: TranslateService,
    private contactService: ContactService
  ) {}

  ngOnInit(): void {}

  onSubmit(form: NgForm): void {
    const isRtl = document.documentElement.dir === 'rtl';
    if (!form.valid) {
      this.toastr.error(
        this.translate.instant('error.fill-all-fields'),
        this.translate.instant('error.form-incomplete'),
        { positionClass: isRtl ? 'toast-top-left' : 'toast-top-right' }
      );
      return;
    }

    const lastTimestampStr = localStorage.getItem('lastMessageTimestamp');
    const now = Date.now();
    if (lastTimestampStr) {
      const lastTimestamp = parseInt(lastTimestampStr, 10);
      if (now - lastTimestamp < 120000) {
        this.toastr.error(
          this.translate.instant('general.pleaseWaitAtLeast2minutes'),
          this.translate.instant('general.tooSoon')
        );
        return;
      }
    }

    this.loadingSubmit = true;

    const contactMessage: ContactMessage = {
      name: form.value.name,
      email: form.value.email,
      subject: form.value.subject,
      message: form.value.comments
    };

    this.contactService.sendMessage(contactMessage).subscribe({
      next: () => {
        localStorage.setItem('lastMessageTimestamp', now.toString());
        this.toastr.success(
          this.translate.instant('general.messageSent'),
          this.translate.instant('general.success')
        );
        this.loadingSubmit = false;
        form.resetForm();
      },
      error: () => {
        this.toastr.error(
          this.translate.instant('general.errorSendingMessage'),
          this.translate.instant('general.error')
        );
        this.loadingSubmit = false;
      }
    });
  }
}
