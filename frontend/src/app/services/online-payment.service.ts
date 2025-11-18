import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OnlinePaymentService {
  constructor(private http: HttpClient) {}

  createTotalpaySession(orderData: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/proformainvoice`;
    return this.http.post(apiUrl, orderData);
  }

  getPiDataById(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/admin/pi-data/${quoteId}`;
    return this.http.get(apiUrl);
  }

  getPaymentMethods(): Observable<any[]> {
    const apiUrl = `${environment.apiUrl}/admin/getpayment`;
    return this.http.get<any[]>(apiUrl);
  }

  getPaymentModesHome(): Observable<any[]> {
    const apiUrl = `${environment.apiUrl}/admin/getpaymentmods`;
    return this.http.get<any[]>(apiUrl);
  }

  getPayNowDataById(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/paynow/${quoteId}`;
    return this.http.get(apiUrl);
  }

  payAFS(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/payafs/${encodeURIComponent(quoteId)}`;
    return this.http.post<any>(
      apiUrl,
      {},
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  payCheckout(quoteId: string) {
    return this.http.post<{ id: string; integrity: string }>(
      `${environment.apiUrl}/user/initCheckout/${encodeURIComponent(quoteId)}`,
      {}
    );
  }

  getAccountDetails(): Observable<any[]> {
    const apiUrl = `${environment.apiUrl}/admin/account-details`;
    return this.http.get<any[]>(apiUrl);
  }

  getQuoteById(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/checkQuoteId/${quoteId}`;
    return this.http.get(apiUrl);
  }

  getSidebarData(): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/sidebardata`;
    return this.http.get(apiUrl);
  }

  payNowSaleforce(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/payNowSaleforce/${quoteId}`;
    const requestBody = {};
    return this.http.post(apiUrl, requestBody);
  }

  getPaymentStatus(resourcePath: string) {
    return this.http.get<any>(`${environment.apiUrl}/user/getPaymentStatus?resourcePath=${encodeURIComponent(resourcePath)}`);
  }

  payNowByStripe(quoteId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/user/payNowByStripe/${quoteId}`;
    return this.http.get(apiUrl);
  }
}


