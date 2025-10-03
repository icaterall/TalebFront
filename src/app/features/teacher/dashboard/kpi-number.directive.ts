// ./directives/kpi-number.directive.ts
import { Directive, ElementRef, Input, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appKpiNumber]',
  standalone: true,
})
export class KpiNumberDirective implements AfterViewInit {
  @Input('appKpiNumber') target = 0;
  @Input() percent = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const duration = 2000;
    const steps = 50;
    const stepValue = this.target / steps;
    let current = 0;
    const element = this.el.nativeElement;

    const interval = window.setInterval(() => {
      current += stepValue;
      if (current >= this.target) {
        current = this.target;
        window.clearInterval(interval);
      }
      element.textContent = `${Math.floor(current)}${this.percent ? '%' : ''}`;
    }, duration / steps);
  }
}
