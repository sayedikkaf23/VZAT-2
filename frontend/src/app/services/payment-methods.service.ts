import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodsService {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPaymentModes(page = 1, limit = '') {
    return this.http.get(
      `${this.url}/admin/get_payment_methods?page=${page}&limit=${limit}`
    );
  }

  updatePaymentMethodStatus(paymentMethodId: any, payload: any) {
    return this.http.put(
      `${this.url}/admin/update_payment_method/${paymentMethodId}`,
      payload
    );
  }

  addPaymentMode(payload: any) {
    return this.http.post(`${this.url}/online/add_payment_mode`, payload);
  }

  updatePaymentModeStatus(payload: any) {
    return this.http.patch(
      `${this.url}/online/update_payment_mode_status`,
      payload
    );
  }

  searchPaymentMode(payload: any) {
    return this.http.post(`${this.url}/online/search_payment_mode`, payload);
  }
}
