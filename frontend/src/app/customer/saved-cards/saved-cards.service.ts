import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SavedCard {
  _id: string;
  maskedCardNumber: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  isDefault: boolean;
  lastUsedDate?: Date;
  cardAddedDate: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  cards?: SavedCard[];
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class SavedCardsService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getCustomerCards(customerId: string): Observable<ApiResponse<SavedCard>> {
    return this.http.get<ApiResponse<SavedCard>>(`${this.apiUrl}/saved-cards/customer/${customerId}/cards`);
  }

  removeCard(cardId: string, customerId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/saved-cards/card/${cardId}`, {
      body: { customerId }
    });
  }

  setDefaultCard(cardId: string, customerId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/saved-cards/card/${cardId}/set-default`, {
      customerId
    });
  }
}
