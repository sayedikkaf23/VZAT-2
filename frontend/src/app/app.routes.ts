import { Routes } from '@angular/router';
import { PaymentScheduleComponent } from './customer/payment-schedule/payment-schedule.component';
import { AdminLogin } from './admin/login/admin-login';
import { Dashboard } from './admin/dashboard/dashboard';
import { Header } from './admin/header/header';
import { PaymentMethods } from './admin/payment-methods/payment-methods';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'paymentSchedule', component: PaymentScheduleComponent },
  { path: 'adminLogin', component: AdminLogin},
  { path: 'header', component: Header},
  { path: 'dashboard', component: Dashboard , 
    canActivate: [AuthGuard]
   },
   { path: 'payment-methods', component: PaymentMethods , 
    //canActivate: [AuthGuard]
   },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  // Add more routes as needed
];
