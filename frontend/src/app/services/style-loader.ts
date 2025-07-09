import { Injectable, Inject, PLATFORM_ID, Renderer2, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StyleLoader {
  private renderer: Renderer2;

  private adminCssHrefs: string[] = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/simplebar.min.css',
    'assets/css/responsive-admin.css',
    'assets/css/select2.min.css',
    'assets/css/stylepay.css'
  ];

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   * Load admin styles dynamically into <head>
   */
  loadAdminStyles(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.adminCssHrefs.forEach(href => {
      if (!this.isStyleLoaded(href)) {
        const linkEl = this.renderer.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = href;
        this.renderer.appendChild(document.head, linkEl);
      }
    });
  }

  /**
   * Remove previously loaded admin styles
   */
  removeAdminStyles(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const links = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

    links.forEach(link => {
      if (this.adminCssHrefs.some(adminHref => link.href.includes(adminHref))) {
        this.renderer.removeChild(document.head, link);
      }
    });
  }

  /**
   * Utility: check if style is already added
   */
private isStyleLoaded(href: string): boolean {
  return Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => (link as HTMLLinkElement).href.includes(href));
}

}
