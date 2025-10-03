// ./directives/ripple.directive.ts
import { Directive, ElementRef, HostListener, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appRipple]',
  standalone: true,
})
export class RippleDirective {
  private isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent): void {
    if (!this.isBrowser) return;

    const host = this.el.nativeElement;
    const ripple = this.renderer.createElement('span');
    this.renderer.addClass(ripple, 'ripple');
    this.renderer.setStyle(ripple, 'position', 'absolute');
    this.renderer.setStyle(ripple, 'left', `${e.offsetX}px`);
    this.renderer.setStyle(ripple, 'top', `${e.offsetY}px`);
    this.renderer.setStyle(ripple, 'transform', 'translate(-50%, -50%)');
    this.renderer.setStyle(ripple, 'width', '0');
    this.renderer.setStyle(ripple, 'height', '0');
    this.renderer.setStyle(ripple, 'borderRadius', '50%');
    this.renderer.setStyle(ripple, 'background', 'rgba(255,255,255,0.5)');
    this.renderer.setStyle(ripple, 'animation', 'rippleEffect 0.6s ease-out');

    this.renderer.appendChild(host, ripple);

    window.setTimeout(() => {
      this.renderer.removeChild(host, ripple);
    }, 600);
  }
}
