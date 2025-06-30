import { Routes } from '@angular/router';
import { PaymentScheduleComponent } from './customer/payment-schedule/payment-schedule.component';
import { AdminLogin } from './components/admin-login/admin-login';
import { Dashboard } from './components/dashboard/dashboard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'paymentSchedule', component: PaymentScheduleComponent },
  { path: 'adminLogin', component: AdminLogin},
  { path: 'dashboard', component: Dashboard , 
    canActivate: [AuthGuard]
   },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  // Add more routes as needed
];
