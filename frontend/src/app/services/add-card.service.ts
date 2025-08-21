import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Declare global window properties for AFS
declare global {
  interface Window {
    wpwlOptions?: any;
  }
}

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
      script.type = 'text/javascript';
      
      // Add error handling for CSP issues
      script.onload = () => {

        resolve();
      };
      
      script.onerror = (error) => {
        console.error('💡 Script URL:', scriptUrl);
        reject(new Error('Failed to load AFS widget script - possible CSP issue'));
      };

      // Log before appending
      console.log('📝 Appending script to document head');
      document.head.appendChild(script);
      
      // Set a timeout as backup
      setTimeout(() => {
        if (!script.onload) {
          console.error('⏰ Script loading timeout after 10 seconds');
          reject(new Error('Script loading timeout'));
        }
      }, 10000);
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

    // Set form attributes for AFS widget
    formElement.setAttribute('action', shopperResultUrl);
    formElement.setAttribute('data-brands', 'VISA MASTER AMEX');
    
    // AFS widgets are automatically initialized when the script loads
    // The script URL already contains the checkout ID, so the form should auto-populate
    
    // Check if the AFS library has created the form fields
    const checkFormFields = () => {
      const cardNumberField = formElement.querySelector('input[name="card.number"]');
      const expiryField = formElement.querySelector('input[name="card.expiryMonth"]') || 
                          formElement.querySelector('input[name="card.expiry"]');
      const cvvField = formElement.querySelector('input[name="card.cvv"]');
      
      if (cardNumberField || expiryField || cvvField) {
        console.log('🔍 Found fields:', {
          cardNumber: !!cardNumberField,
          expiry: !!expiryField,
          cvv: !!cvvField
        });
        return true;
      }
      return false;
    };

    // Check for form fields with retries
    let retryCount = 0;
    const maxRetries = 10;
    const checkInterval = setInterval(() => {
      retryCount++;
      
      if (checkFormFields()) {
        clearInterval(checkInterval);
        console.log('✅ AFS registration form initialized successfully');
      } else if (retryCount >= maxRetries) {
        clearInterval(checkInterval);
        console.error('❌ AFS form fields not created after', maxRetries, 'attempts');
        console.log('🔍 Form content:', formElement.innerHTML);
        
        // Log what's available in the window object
        console.log('🔍 Available window properties:', Object.keys(window).filter(key => 
          key.toLowerCase().includes('wp') || 
          key.toLowerCase().includes('afs') || 
          key.toLowerCase().includes('oppwa')
        ));
      } else {
        console.log(`🔄 Waiting for AFS form fields... (attempt ${retryCount}/${maxRetries})`);
      }
    }, 500);
  }
}
