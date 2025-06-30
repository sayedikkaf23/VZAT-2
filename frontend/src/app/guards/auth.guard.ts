    // src/app/guards/auth.guard.ts
    import { Injectable } from '@angular/core';
    import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
    import { AuthService } from '../services/auth.service';
    import { Observable } from 'rxjs';

    @Injectable({
      providedIn: 'root'
    })
    export class AuthGuard implements CanActivate {
      constructor(private authService: AuthService, private router: Router) {}

      canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (this.authService.isAuthenticated()) {
          return true;
        } else {
          this.router.navigate(['/adminLogin']); // Redirect to your login route
          return false;
        }
      }
    }