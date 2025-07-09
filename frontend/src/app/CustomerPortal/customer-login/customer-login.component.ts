import { Component,Inject, PLATFORM_ID , Renderer2 , ViewEncapsulation} from '@angular/core';
//import { isPlatformBrowser, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { ToastrService } from 'ngx-toastr';
import { CookieService } from 'ngx-cookie-service';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-customer-login',
  imports: [FormsModule,CommonModule],
  templateUrl: './customer-login.component.html',
  styleUrl: './customer-login.component.scss',
})

export class CustomerLoginComponent {
  loading = true; 
  private themeUrls = [
    'assets/CustomerPortal/css/style.css',
    'assets/CustomerPortal/css/responsive.css'
  ];

    passwordVisible: boolean = false;
    passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\(\)+\\;:'",.<>\/?=_\{\}\[\]\|\-]).{8,}$/;
    loginDetails = {
    email : '',
    password: ''
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,  
    private renderer: Renderer2,
    private router: Router,
    private customerLoginService: CustomerLoginService,
    private toastr: ToastrService,
    private cookieService: CookieService,
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
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  //console.log(loginDetails);

  login(data:any):void{
    console.log("hi");
    console.log('Login data:', this.loginDetails);
    if(this.loginDetails.email != '' && this.loginDetails.password != ''){
      this.customerLoginService.loggingIn(this.loginDetails).subscribe({
        next: (res: any) => {
          console.log(res);
          if (res.loggedIn***REMOVED***1) {
            this.cookieService.set('jwtToken', res.token);
            console.log("Logged In")
            this.router.navigate(['/active-services']);   //set the navigation path for customer, after logging in 
          } else {
            this.toastr.error(res.message);
        }
        },
        error: (err:any) => {
        console.log(err)
        },
        complete: () => {},
      });
    }
    else{
      console.log("first");
      this.toastr.error("Both Email and password are required to login");
    }
  }

    ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
