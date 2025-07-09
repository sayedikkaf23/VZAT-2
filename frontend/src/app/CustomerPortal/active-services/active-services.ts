import { Component,Inject, PLATFORM_ID , Renderer2} from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';

@Component({
  selector: 'app-active-services',
  imports: [NgIf, RouterLink],
  templateUrl: './active-services.html',
  styleUrl: './active-services.scss',  
})
export class ActiveServices {

  isAdditionalModalOpen: boolean = false;
  isServiceModalOpen:boolean = false;
  isUploadModalOpen:boolean = false;
    isSidebarHidden = false;
  isNavbarActive = false;

   constructor(  @Inject(DOCUMENT) private document: Document,  private renderer: Renderer2, private customerLogin: CustomerLoginService) {}

   openModal(): void {
    this.isAdditionalModalOpen = true;
    console.log('modal open --', this.isAdditionalModalOpen);
  }


  onLogout(): void {
    this.customerLogin.logout();
  }
  closeModal(): void {
    this.isAdditionalModalOpen = false;
  }

     openUploadModal(): void {
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
  }

     openServiceModal(): void {
    this.isServiceModalOpen = true;
  }

  closeServiceModal(): void {
    this.isServiceModalOpen = false;
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



}
