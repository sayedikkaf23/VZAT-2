import { Component,Inject, PLATFORM_ID , Renderer2 , ElementRef} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-saved-card',
  imports: [RouterLink],
  templateUrl: './saved-card.html',
  styleUrl: './saved-card.scss'
})
export class SavedCard {
  loading = true; 
    private themeUrls = [
    'assets/CustomerPortal/css/style.css',
    'assets/CustomerPortal/css/responsive.css'
  ];
    isSidebarHidden = false;
      isNavbarActive = false;
   constructor( @Inject(DOCUMENT) private document: Document, private renderer: Renderer2, private el: ElementRef, private customerLogin: CustomerLoginService, private styleLoader:StyleLoader) {}
  ngOnInit(): void {
     this.styleLoader.loadThemes(this.themeUrls)
    .then(() => {
      // Styles loaded, show content
      this.loading = false;
    })
    .catch(err => {
      console.error(err);
      this.loading = false; // Show anyway if failed
    });
  }

   onLogout(): void {
    this.customerLogin.logout();
  }

    toggleSidebar(): void {
    this.isSidebarHidden = !this.isSidebarHidden;

    if (this.isSidebarHidden) {
      this.renderer.addClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.addClass(adminBody, 'sidebar-hidden');
    } else {
      this.renderer.removeClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.removeClass(adminBody, 'sidebar-hidden');
    }
  }

    toggleNavbar(): void {
    this.isNavbarActive = !this.isNavbarActive;

    const toggleElement = this.document.querySelector('.navbar-toggle');
    if (toggleElement) {
      if (this.isNavbarActive) {
        toggleElement.classList.add('active');
      } else {
        toggleElement.classList.remove('active');
      }
    }
  }

      ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
