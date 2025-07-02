import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service'; 
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import "@fontsource/dm-sans"; 

@Component({
  selector: 'app-header',
  imports: [FormsModule,CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
constructor(private authService: AuthService) { }
   onLogout(): void {
    this.authService.logout();
  }

}

