import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-dashboard',
  imports: [],
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
