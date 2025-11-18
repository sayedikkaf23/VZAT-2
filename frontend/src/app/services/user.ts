import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class User {

  url = environment.apiUrl;
  public roleName = '';

  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = '') {
    return this.http.get(
      `${this.url}/admin/get_users?page=${page}&limit=${limit}`
    );
  }

  addUser(payload: any) {
    return this.http.post(`${this.url}/admin/add_user`, payload);
  }

  updateUser(userId: any, payload: any) {
    return this.http.put(`${this.url}/admin/update_user/${userId}`, payload);
  }

  deleteUser(payload: any) {
    return this.http.patch(`${this.url}/admin/delete_user`, payload);
  }

  getUserById(userId: any) {
    return this.http.get(`${this.url}/admin/get_user/${userId}`);
  }

  updateUserStatus(payload: any) {
    return this.http.patch(`${this.url}/admin/update_user_status`, payload);
  }

  searchUser(payload: any) {
    return this.http.post(`${this.url}/admin/search_user`, payload);
  }

  getUserPermissions() {
    return this.http.get(`${this.url}/admin/get_user_permissions`);
  }

  downloadLogs(): Observable<Blob> {
    return this.http.get(`${this.url}/admin/download_all_logs`, {
      responseType: 'blob',
    });
  }

  generateAccIdAndInvoiceId() {
    return this.http.get(`${this.url}/admin/generateAccIdAndInvoiceId`);
  }
  getLatestInvoiceDetails() {
    return this.http.get(`${this.url}/admin/getLatestInvoice`);
  }
  getProfile() {
    return this.http.get(`${this.url}/admin/getProfile`);
  }
  getMail() {
    return this.http.get(`${this.url}/admin/getMail`);
  }
  findManulePiDataAndUpdate(formData: FormData) {
    return this.http.post(
      `${this.url}/admin/findManulePiDataAndUpdate`,
      formData
    );
  }

  saveProfile(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/admin/saveProfile`, formData);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.url}/admin/updateProfile`, formData);
  }
  updatemailbody(payload: any): Observable<any> {
    return this.http.put(`${this.url}/admin/updateMail`, payload);
  }

  digicomplice(payload: any): Observable<any> {
    return this.http.post(`${this.url}/user/digicomplice`, payload);
  }

  checkStatus(data: { CustomerId: string; CompanyName: string }): Observable<any> {
    return this.http.post(`${this.url}/user/checkStatus`, data);
  }

  getCountryRisks() {
    return this.http.get<any[]>(`${this.url}/user/country-risk/all`);
  }
}
