import { Component,Inject, PLATFORM_ID , Renderer2 , ViewEncapsulation} from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';

@Component({
  selector: 'app-customer-login',
  imports: [NgIf],
  templateUrl: './customer-login.component.html',
  styleUrl: './customer-login.component.scss',
   encapsulation: ViewEncapsulation.None
})

export class CustomerLoginComponent {


    passwordVisible: boolean = false;
  constructor(@Inject(PLATFORM_ID) private platformId: Object,  private renderer: Renderer2) {}

  
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

}
