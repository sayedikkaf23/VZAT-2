import { Component } from '@angular/core';
import { User} from '../../services/user';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { StyleLoader } from '../../services/style-loader';

interface InvoiceItem {
  description: string;
  unitCost: number | null;
  quantity: number | null;
  amount: number | null;
}

@Component({
  selector: 'app-invoice-generator',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './invoice-generator.html',
  styleUrl: './invoice-generator.scss'
})
export class InvoiceGenerator {
    private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
  profileData: any;
  items: InvoiceItem[] = [
    {
      description: '',
      unitCost: null,
      quantity: null,
      amount: null,
    },
  ];
  fileName: string = '';
  taxPercentage: number = 0;
  discount: number = 0;
  shippingFee: number = 0;
  bankDetails: string = '';
  termsAndConditions: string = '';
  Notes: string = '';
  invoiceNumber: string = '';
  purchaseOrder: string = '';
  companyDetails: string = '';
  billTo: string = '';
  currency: string = 'AED';
  invoiceDate: string = '';
  dueDate: string = '';
  salesPersonName: string = '';
  salesPersonMobile: any = '';
  salesPersonEmail: String = '';
  accountId: String ='';
  email: String = '';
  invoiceData: any;
  type: string ='';
  loading: boolean = true;
  selectedImage: string | null = null;

  constructor(
    private userService: User,
    private route: ActivatedRoute,
    private router: Router,
    private styleLoader: StyleLoader
  ) {}

  ngOnInit(): void {
         this.styleLoader.loadThemes(this.themeUrls)
    .then(() => {
      // Styles loaded, show content
      this.loading = false;
    })
    .catch(err => {
      console.error(err);
      this.loading = false; // Show anyway if failed
    });
    this.type = this.route.snapshot.paramMap.get('type') || '';
    if (this.type ***REMOVED***= 'generate') {
      const hash = location.hash.substring(1);
      const [accountId, invoiceNumber] = hash.split('-');
      if (!accountId && !invoiceNumber) {
        this.generateAccIdAndInvoiceId();
      } else {
        this.accountId = accountId;
        this.invoiceNumber = invoiceNumber;
      }
    }
    if (this.type ***REMOVED***= 'Edit') {
      this.route.queryParams.subscribe((params) => {
        if (params['invoice']) {
          this.invoiceData = JSON.parse(params['invoice']);
          console.log('Received invoice data:', this.invoiceData);
        }
      });

      if (this.invoiceData) {
        console.log(this.invoiceData, 'this.invoiceData');
        this.items = this.invoiceData.items || [];
        this.fileName = this.invoiceData.fileName || '';
        this.taxPercentage = this.invoiceData.taxPercentage || 0;
        this.discount = this.invoiceData.discount || 0;
        this.shippingFee = this.invoiceData.shippingFee || 0;
        this.bankDetails = this.invoiceData.bankDetails || '';
        this.Notes = this.invoiceData.Notes || '';
        this.invoiceNumber = this.invoiceData.invoiceNumber || '';
        this.purchaseOrder = this.invoiceData.purchaseOrder || '';
        this.companyDetails = this.invoiceData.companyDetails || '';
        this.billTo = this.invoiceData.billTo || '';
        this.currency = this.invoiceData.currency || 'AED';
        this.invoiceDate = this.invoiceData.invoiceDate || '';
        this.dueDate = this.invoiceData.dueDate || '';
        this.salesPersonName = this.invoiceData.salesPersonName || '';
        this.salesPersonMobile = this.invoiceData.salesPersonMobile;
        this.salesPersonEmail = this.invoiceData.salesPersonEmail;
        this.accountId = this.invoiceData.accountId || '';
        this.email = this.invoiceData.email || '';
        this.termsAndConditions = this.invoiceData.termsAndConditions;
        this.bankDetails = this.invoiceData.bankDetails;
        this.Notes = this.invoiceData.Notes;
        this.termsAndConditions = this.invoiceData.termsAndConditions;
        this.bankDetails = this.invoiceData.bankDetails;
      }
    }
    this.getProfile();
    this.getLatestInvoiceDetails();
    this.loading = false;


    if (this.items.length ***REMOVED***= 0) {
      this.addItem();
    }
  }

  updateItemAmount(item: InvoiceItem): void {
    if (item.unitCost !***REMOVED*** null && item.quantity !***REMOVED*** null) {
      item.amount = item.unitCost * item.quantity;
    } else {
      item.amount = null;
    }
  }

  getProfile(): void {
    this.userService.getProfile().subscribe({
      next: (res: any) => {
        this.profileData = res;
        if (this.type ***REMOVED***= 'generate') {
          this.salesPersonName = res.salesPersonName;
          this.termsAndConditions = res.termsAndConditions;
          this.bankDetails = res.bankDetails;
          this.Notes = res.notes;
        }
        console.log('Profile data saved:', this.profileData);
      },
      error: (err) => {
        console.error('Error fetching profile:', err);
      },
    });
  }

  addItem(): void {
    this.items.push({
      description: '',
      unitCost: null,
      quantity: null,
      amount: null,
    });
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    // Ensure at least one empty item remains
    if (this.items.length ***REMOVED***= 0) {
      this.addItem();
    }
  }
  
  get subtotal(): number {
    console.log('Subtotal getter called');
    const itemsTotal = this.items.reduce((acc, item) => {
      return acc + (item.amount ?? 0);
    }, 0);
    return itemsTotal;
  }

  get total(): number {
    const taxAmount = (this.subtotal * this.taxPercentage) / 100;
    return this.subtotal + taxAmount - this.discount + this.shippingFee;
  }

  removeImage(): void {
    this.fileName = '';
    this.selectedImage = null;
  }

  generateAccIdAndInvoiceId() {
    this.userService.generateAccIdAndInvoiceId().subscribe({
      next: (res: any) => {
        this.accountId = res?.accountId;
        this.invoiceNumber = res?.invoiceNumber;
        location.hash = `${res?.accountId}-${res?.invoiceNumber}`;
      },
      error: () => {},
      complete: () => {},
    });
  }

  getLatestInvoiceDetails() {
    this.userService.getLatestInvoiceDetails().subscribe({
      next: (res: any) => {
        console.log(res);
        if (this.type ***REMOVED***= 'generate') {
          this.salesPersonEmail = res.salesPersonEmail;
          this.salesPersonMobile = res.salesPersonMobile;
        }
      },
      error: () => {},
      complete: () => {},
    });
  }

  saveInvoiceDetail(): void {
    // Validate items: ensure no item has missing required fields



    this.items = this.items.filter((item) => !this.isItemEmpty(item));

    if (this.items.length ***REMOVED***= 0) {
      alert('Please add at least one item to the invoice.');
      return;
    }

    // Validate items: ensure no item has missing required fields
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (
        !item.description.trim() ||
        item.unitCost ***REMOVED***= null ||
        item.quantity ***REMOVED***= null ||
        item.amount ***REMOVED***= null
      ) {
        alert(
          `Item ${i + 1} is incomplete. Please fill in all required fields.`
        );
        return;
      }
    }







    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (
        !item.description.trim() ||
        item.unitCost ***REMOVED***= null ||
        item.quantity ***REMOVED***= null ||
        item.amount ***REMOVED***= null
      ) {
        alert(`Item ${i + 1} is incomplete. Please fill in all required fields.`);
        return;
      }
    }

    if (this.invoiceData?.paymentLinkGenerated) {
      let response = confirm(
        'Payment link generated already for this invoice.'
      );
      if (!response) {
        return;
      }
    }

    if (
      this.items.length ***REMOVED***= 0 ||
      !this.invoiceNumber ||
      !this.companyDetails ||
      !this.billTo ||
      !this.currency ||
      !this.invoiceDate ||
      !this.dueDate ||
      !this.salesPersonName ||
      !this.salesPersonMobile ||
      !this.salesPersonEmail ||
      !this.accountId ||
      !this.email
    ) {
      let missingField = '';
      if (this.items.length ***REMOVED***= 0) {
        missingField = 'Items';
      } else if (!this.invoiceNumber) {
        missingField = 'Invoice Number';
      } else if (!this.companyDetails) {
        missingField = 'Company Details';
      } else if (!this.billTo) {
        missingField = 'Bill To';
      } else if (!this.currency) {
        missingField = 'Currency';
      } else if (!this.invoiceDate) {
        missingField = 'Invoice Date';
      } else if (!this.dueDate) {
        missingField = 'Due Date';
      } else if (!this.salesPersonName) {
        missingField = 'Sales Person Name';
      } else if (!this.salesPersonMobile) {
        missingField = 'Sales Person Mobile';
      } else if (!this.salesPersonEmail) {
        missingField = 'Sales Person Email';
      } else if (!this.accountId) {
        missingField = 'Account ID';
      } else if (!this.email) {
        missingField = 'Email';
      }

      alert(`Please fill in the required field: ${missingField}`);
      return;
    }

    // Set loading to true before starting the process
    this.loading = true;

    const formData = new FormData();

    const payload = {
      items: JSON.stringify(this.items),
      taxPercentage: this.taxPercentage,
      discount: this.discount,
      shippingFee: this.shippingFee,
      bankDetails: this.bankDetails,
      termsAndConditions: this.termsAndConditions,
      Notes: this.Notes,
      invoiceNumber: this.invoiceNumber,
      purchaseOrder: this.purchaseOrder,
      companyDetails: this.companyDetails,
      billTo: this.billTo,
      currency: this.currency,
      invoiceDate: this.invoiceDate,
      dueDate: this.dueDate,
      salesPersonName: this.salesPersonName,
      salesPersonMobile: this.salesPersonMobile,
      salesPersonEmail: this.salesPersonEmail,
      accountId: this.accountId,
      email: this.email,
      totalAmount: this.total,
      status: 'Draft',
      paymentLinkGenerated: true,
    };

    for (const key in payload) {
      if (payload.hasOwnProperty(key)) {
        // formData.append(key, payload[key]);
      }
    }

    // Call the API and handle loading state
    this.userService.findManulePiDataAndUpdate(formData).subscribe({
      next: (res: any) => {
        if (this.type ***REMOVED***= 'Edit') {
          alert('Invoice Updated Successfully');
          this.router.navigate(['/panel/manual_invoice_payment']);
        }
        if (this.type ***REMOVED***= 'generate') {
          alert('Invoice Generated Successfully');
          this.router.navigate(['/panel/manual_invoice_payment']);
        }
      },
      error: () => {
        // Handle error here and stop loading
        alert('An error occurred while processing the invoice.');
        this.loading = false; // Stop loading in case of an error
      },
      complete: () => {
        // Stop loading after the process completes
        this.loading = false;
      },
    });
  }

  CancelInvoiceDetail(): void {
    this.items = [
      {
        description: '',
        unitCost: null,
        quantity: null,
        amount: null,
      },
    ];
    this.taxPercentage = 0;
    this.discount = 0;
    this.shippingFee = 0;
    this.bankDetails = '';
    this.Notes = '';
    this.purchaseOrder = '';
    this.companyDetails = '';
    this.billTo = '';
    this.currency = 'AED';
    this.invoiceDate = '';
    this.dueDate = '';
    this.salesPersonName = '';
    this.salesPersonMobile = 0;
    this.salesPersonEmail = '';
    this.email = '';
    this.removeImage();
  }

  onSelect(event: any): void {
    const file: File = event.target.files[0];
    const element = event.currentTarget as HTMLInputElement;
    const files: FileList | null = element.files;
      if (!files || files.length ***REMOVED***= 0) {
    this.fileName = 'null'; // Reset or set default
    console.warn('No file selected.');
    return; // Stop execution of the rest of the function
  }
    this.fileName = files[0]?.name;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  isItemEmpty(item: InvoiceItem): boolean {
    return (
      !item.description.trim() &&
      (item.unitCost ***REMOVED***= null || item.unitCost ***REMOVED***= 0) &&
      (item.quantity ***REMOVED***= null || item.quantity ***REMOVED***= 0)
    );
  }
      ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
