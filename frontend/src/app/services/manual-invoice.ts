import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManualInvoice {

  url = environment.apiUrl;
  public roleName = '';

  constructor(private http: HttpClient) {}

  getAllManualInvoice() {
    return this.http.get(`${this.url}/admin/getManualInvoicePayment`);
  }

  getManualInvoiceById(id: any) {
    return this.http.get(`${this.url}/admin/getManualPiDataById/${id}`);
  }
  searchManualInvoices(searchParams: { searchTerm: string; page: number; limit: number }) {
    return this.http.post(`${this.url}/admin/searchManualInvoices`, searchParams);
  }
}
