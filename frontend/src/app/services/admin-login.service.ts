import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root',
})

export class AdminLoginService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  loggingIn(data:{email:String,password:String}): Observable<any> {
    const url = `${this.url}/adminLogin`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' }); 
    return this.http.post(url, data, { headers ,  withCredentials: true });
  }
}