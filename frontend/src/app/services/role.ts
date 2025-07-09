import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Role {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getRoles(page = 1, limit = '', is_paginated = true) {
    return this.http.get(
      `${this.url}/admin/get_roles?page=${page}&limit=${limit}&is_paginated=${is_paginated}`
    );
  }

  addRole(payload: any) {
    return this.http.post(`${this.url}/admin/add_role`, payload);
  }

  updateRole(roleId: any, payload: any) {
    return this.http.put(`${this.url}/admin/update_role/${roleId}`, payload);
  }

  deleteRole(payload: any) {
    return this.http.patch(`${this.url}/admin/delete_role`, payload);
  }

  getRoleById(roleId: any) {
    return this.http.get(`${this.url}/admin/get_role/${roleId}`);
  }

  updateRoleStatus(payload: any) {
    return this.http.patch(`${this.url}/admin/update_role_status`, payload);
  }

  searchRole(payload: any) {
    return this.http.post(`${this.url}/admin/search_role`, payload);
  }



}
