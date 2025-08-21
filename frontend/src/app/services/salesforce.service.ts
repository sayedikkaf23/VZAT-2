import { HttpClient, HttpParams  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root',
})

export class SalesForceService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSalesForceDetails(): Observable<any> {
    const url = `${this.url}/salesForce`;

    let params = new HttpParams();
    params = params.append('token', '2');

    return this.http.get(url, { params: params });  
  }
}