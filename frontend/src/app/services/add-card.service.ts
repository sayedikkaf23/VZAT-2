import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PrepareRegistrationResponse {
  success: boolean;
  checkoutId: string;
  message: string;
  afsConfig: {
    baseUrl: string;
    scriptUrl: string;
  };
}

export interface RegistrationCallbackResponse {
  success: boolean;
  message: string;
  card?: {
    id: string;
    last4: string;
    brand: string;
    holder: string;
    isDefault: boolean;
  };
  registrationId?: string;
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  holder: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  createdAt: Date;
  hasRegistrationId: boolean;
}

export interface CustomerCardsResponse {
  success: boolean;
  cards: SavedCard[];
}

@Injectable({
  providedIn: 'root'
})
export class AddCardService {
  private apiUrl = `${environment.apiUrl}/cards`;

  constructor(private http: HttpClient) {}

  /**
   * Step 1: Prepare AFS checkout for card registration
   */
  prepareCardRegistration(customerEmail: string): Observable<PrepareRegistrationResponse> {
    return this.http.post<PrepareRegistrationResponse>(`${this.apiUrl}/prepare-registration`, {
      customerEmail
    });
  }

  /**
   * Step 2: Handle card registration callback
   */
  handleRegistrationCallback(checkoutId: string, customerEmail: string): Observable<RegistrationCallbackResponse> {
    return this.http.post<RegistrationCallbackResponse>(`${this.apiUrl}/registration-callback`, {
      checkoutId,
      customerEmail
    });
  }

  /**
   * Get customer's saved cards
   */
  getCustomerCards(customerEmail: string): Observable<CustomerCardsResponse> {
    return this.http.get<CustomerCardsResponse>(`${this.apiUrl}/${customerEmail}`);
  }

  /**
   * Set a card as default
   */
  setDefaultCard(cardId: string, customerEmail: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/set-default`, {
      cardId,
      customerEmail
    });
  }

  /**
   * Load AFS payment widget script dynamically
   */
  loadAfsScript(scriptUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove existing AFS scripts to avoid conflicts
      const existingScript = document.getElementById('afs-widget-script');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'afs-widget-script';
      script.src = scriptUrl;
      script.onload = () => {
        console.log('✅ AFS widget script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load AFS widget script');
        reject(new Error('Failed to load AFS widget script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize AFS registration form
   */
  initializeRegistrationForm(shopperResultUrl: string): void {
    // First check if the form element exists
    const formElement = document.querySelector('.paymentWidgets') as HTMLFormElement;
    if (!formElement) {
      console.error('❌ Payment form element (.paymentWidgets) not found in DOM');
      console.log('🔍 Available forms:', document.querySelectorAll('form'));
      return;
    }

    console.log('✅ Payment form element found:', formElement);

    // Set form attributes
    formElement.setAttribute('action', shopperResultUrl);
    formElement.setAttribute('data-brands', 'VISA MASTER AMEX');
    
    // Check if wpwl is available globally (AFS widget library)
    if (typeof (window as any).wpwl !== 'undefined') {
      console.log('✅ AFS wpwl library is available');
      
      // Initialize AFS widget
      try {
        (window as any).wpwl.configure({
          locale: 'en',
          style: {
            base: {
              color: '#495057',
              fontSize: '16px',
              fontFamily: '"Poppins", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }
          }
        });
        
        console.log('✅ AFS registration form initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing AFS widget:', error);
      }
    } else {
      console.error('❌ AFS wpwl library not available. Script may not be loaded properly.');
      console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('wp') || key.includes('afs') || key.includes('oppwa')));
    }
  }
}
