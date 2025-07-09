import { Injectable, Inject, PLATFORM_ID, Renderer2, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StyleLoader {
constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private loadedThemes: { [key: string]: HTMLLinkElement } = {};

   loadTheme(themeUrl: string): Promise<void> {
     if (!isPlatformBrowser(this.platformId)) {
      // running on server: skip
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      if (!this.loadedThemes[themeUrl]) {
        const head = document.getElementsByTagName('head')[0];
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = themeUrl;
        themeLink.onload = () => resolve();
        themeLink.onerror = () => reject(`Failed to load CSS: ${themeUrl}`);
        head.appendChild(themeLink);
        this.loadedThemes[themeUrl] = themeLink;
      } else {
        // Already loaded
        resolve();
      }
    });
  }

  removeTheme(themeUrl: string): void {
        if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const themeLink = this.loadedThemes[themeUrl];
    if (themeLink) {
      themeLink.remove();
      delete this.loadedThemes[themeUrl];
    }
  }

    /**
   * Load multiple CSS files
   */
  loadThemes(themeUrls: string[]): Promise<void> {
     if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    const promises = themeUrls.map(url => this.loadTheme(url));
    return Promise.all(promises).then(() => undefined);
  }

  /**
   * Remove multiple CSS files
   */
  removeThemes(themeUrls: string[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    themeUrls.forEach(url => this.removeTheme(url));
  }

}
