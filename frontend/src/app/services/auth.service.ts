  // src/app/services/auth.service.ts
    import { Injectable } from '@angular/core';
    import { CookieService } from 'ngx-cookie-service';
    import { Router } from '@angular/router';

    @Injectable({
      providedIn: 'root'
    })
    export class AuthService {

      constructor(private cookieService: CookieService,private router: Router) {}
      isAuthenticated(): boolean {
        const cookieExists: boolean = this.cookieService.check('jwtToken');
        const token =  this.cookieService.get('jwtToken');
        return !!token;
      }

      logout(): void {
        this.cookieService.delete('jwtToken'); 
        this.router.navigate(['/adminLogin']);
      }
    }