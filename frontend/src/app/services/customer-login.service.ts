import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {Observable} from "rxjs";
   import { CookieService } from 'ngx-cookie-service';
       import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})

export class CustomerLoginService {
  url = environment.apiUrl;

  constructor(private http: HttpClient, private cookieService: CookieService, private router: Router) {}

  loggingIn(data:{email:String,password:String}): Observable<any> {
    const url = `${this.url}/customer/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' }); 
    return this.http.post(url, data, { headers ,  withCredentials: true });
  }

  requestPasswordReset(email: string): Observable<any> {
    const url = `${this.url}/customer/forgot-password`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { email }, { headers });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<any> {
    const url = `${this.url}/customer/reset-password`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, { email, token, newPassword }, { headers });
  }

        logout(): void {
        this.cookieService.delete('jwtToken'); 
        this.router.navigate(['/login']);
      }
}