import { Component } from '@angular/core';
import {Header} from '../header/header';
import {NavigationPanel} from '../navigation-panel/navigation-panel'
import {PaymentMethods} from '../payment-methods/payment-methods'
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-dashboard',
  imports: [Header,NavigationPanel,PaymentMethods],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  providers: [],
})
export class Dashboard {
  constructor(private authService: AuthService) { }

  onLogout(): void {
    this.authService.logout();
  }

}
