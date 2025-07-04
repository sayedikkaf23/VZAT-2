import { Routes } from '@angular/router';
import { PaymentScheduleComponent } from './customer/payment-schedule/payment-schedule.component';
import { AdminLogin } from './admin/login/admin-login';
import { Dashboard } from './admin/dashboard/dashboard';
import { Header } from './admin/header/header';
import { NavigationPanel } from './admin/navigation-panel/navigation-panel';
import { PaymentMethods } from './admin/payment-methods/payment-methods';
import { AuthGuard } from './guards/auth.guard';
import { CustomerLoginComponent } from './CustomerPortal/customer-login/customer-login.component';
import { ActiveServices } from './CustomerPortal/active-services/active-services';
import { HelpCenter } from './CustomerPortal/help-center/help-center';
import { SavedCard } from './CustomerPortal/saved-card/saved-card';

export const routes: Routes = [
  { path: 'paymentSchedule', component: PaymentScheduleComponent },
  { path: 'adminLogin', component: AdminLogin},
  { path: 'dashboard', component: Dashboard , 
     canActivate: [AuthGuard]
   },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: CustomerLoginComponent },
  { path: 'active-services', component: ActiveServices },
  { path: 'help-center', component: HelpCenter },
  { path: 'saved-card', component: SavedCard },
  // Add more routes as needed
];
