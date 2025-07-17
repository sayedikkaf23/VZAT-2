import { Routes } from '@angular/router';
import { PaymentScheduleComponent } from './customer/payment-schedule/payment-schedule.component';
import { AdminLogin } from './admin/login/admin-login';
import { AuthGuard } from './guards/auth.guard';
import { CustomerLoginComponent } from './CustomerPortal/customer-login/customer-login.component';
import { PaymentComponent } from './Payment/payment-component/payment-component';
import { PaymentResultComponent } from './Payment/result/payment-result-component/payment-result.component';
import { ActiveServices } from './CustomerPortal/active-services/active-services';
import { HelpCenter } from './CustomerPortal/help-center/help-center';
import { SavedCard } from './CustomerPortal/saved-card/saved-card';
import { RoleList } from './admin/role-list/role-list';
import { RoleAdd } from './admin/role-add/role-add';
import { UserList } from './admin/user-list/user-list';
import { DashboardLayout } from './admin/dashboard-layout/dashboard-layout';
import { UserAdd } from './admin/user-add/user-add';
import { MailManagement } from './admin/mail-management/mail-management';
import { Profile } from './admin/profile/profile';
import { ManualInvoicePayment } from './admin/manual-invoice-payment/manual-invoice-payment';
import { InvoiceGenerator } from './admin/invoice-generator/invoice-generator';
import { PaymentMethods } from './admin/payment-methods/payment-methods';

export const routes: Routes = [
  { path: 'paymentSchedule', component: PaymentScheduleComponent },
  { path: 'adminLogin', component: AdminLogin},
  { path: 'payment/:checkoutId', component: PaymentComponent},
  { path: 'payment/result', component: PaymentResultComponent },

  // { path: 'dashboard', component: Dashboard , 
  //    canActivate: [AuthGuard]
  //  },
  // { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: CustomerLoginComponent },
  { path: 'active-services', component: ActiveServices },
  { path: 'help-center', component: HelpCenter },
  { path: 'saved-card', component: SavedCard },

       {
    path: 'panel',
    component: DashboardLayout,
     canActivate: [AuthGuard],
    children: [


      {
        path: 'roles',
        component: RoleList,
        canActivate: [AuthGuard],
      },
      {
        path: 'add_role',
        component: RoleAdd,
        canActivate: [AuthGuard],
      },
      {
        path: 'users',
        component: UserList,
        canActivate: [AuthGuard],
      },
      {
        path: 'add_user',
        component: UserAdd,
        canActivate: [AuthGuard],
      },

      {
        path: 'profile',
        component: Profile,
        canActivate: [AuthGuard],
      },
      {
        path: 'mail',
        component: MailManagement,
        canActivate: [AuthGuard],
      },
      {
        path: 'payment-method',
        component: PaymentMethods,
        canActivate: [AuthGuard],
      },
      {
        path: 'manual_invoice_payment',
        component: ManualInvoicePayment,
        canActivate: [AuthGuard],
      },
            {
        path: 'invoice/:type',
        component: InvoiceGenerator,
        canActivate: [AuthGuard],
      },
    ],
  },
  // Add more routes as needed
];
