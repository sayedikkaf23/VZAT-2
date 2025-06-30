import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import { AdminLoginService } from '../../services/admin-login.service';
import { ToastrService } from 'ngx-toastr';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule,CommonModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {

 passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-+=[\]{};':"\\|,.<>/?]).{8,}$/;
  loginDetails = {
    email: '',
    password: ''
  };

constructor(private router: Router,
   private adminLoginService: AdminLoginService,
   private toastr: ToastrService,
   private cookieService: CookieService
) { }

  //console.log(loginDetails);

  login(data:any):void{
    console.log("hi");
    console.log('Login data:', this.loginDetails);
    this.adminLoginService.loggingIn(this.loginDetails).subscribe({
      next: (res: any) => {
        console.log(res);
        if (res.loggedIn***REMOVED***1) {
          this.cookieService.set('jwtToken', res.token);
          this.router.navigate(['/dashboard']); 
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
}



