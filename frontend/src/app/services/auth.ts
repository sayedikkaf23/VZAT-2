import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  constructor(private router: Router) {}

  get token() {
    return localStorage.getItem('admin_token');
  }

  getToken() {
    return this.token;
  }

  isAuthenticated(): boolean {
    // Implement logic to check if the user is authenticated based on the token
    return !!this.getToken();
  }

  logOut() {
    localStorage.clear();
    this.router.navigate(['/admin/login']);
  }

  get userName() {
    return localStorage.getItem('user_name');
  }
}
