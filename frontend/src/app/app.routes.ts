import { Routes } from '@angular/router';
import { PaymentScheduleComponent } from './customer/payment-schedule/payment-schedule.component';
import { AdminLogin } from './admin/login/admin-login';
import { AuthGuard } from './guards/auth.guard';
import { CustomerLoginComponent } from './CustomerPortal/customer-login/customer-login.component';
import { PaymentComponent } from './Payment/payment-component/payment-component';
import { PaymentResultComponent } from './payment-result/payment-result.component';
import { ActiveServices } from './CustomerPortal/active-services/active-services';
import { HelpCenter } from './CustomerPortal/help-center/help-center';
import { SavedCard } from './CustomerPortal/saved-card/saved-card';
import { AddCardComponent } from './CustomerPortal/add-card/add-card.component';
import { SavedCardsComponent } from './customer/saved-cards/saved-cards.component';
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
import { PaymentWidgetComponent } from './payment-widget/payment-widget.component';
import { ForgotPasswordComponent } from './CustomerPortal/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './CustomerPortal/reset-password/reset-password.component';
import { PaymentFormComponent } from './payment-form/payment-form.component';
import { PaymentSelectComponent } from './payment-select/payment-select.component';
import { PaymentPendingComponent } from './payment-pending/payment-pending.component';
import { PaymentCompanyComponent } from './payment-company/payment-company.component';

export const routes: Routes = [
  // Default route - redirect to customer login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  { path: 'paymentSchedule', component: PaymentScheduleComponent },
  { path: 'paymentSchedule/:quotepaymentId', component: PaymentScheduleComponent },
  { path: 'payment-schedule/:quotepaymentId', component: PaymentScheduleComponent }, // Route for email links with quotepaymentId
  { path: 'payment-widget', component: PaymentWidgetComponent },
  { path: 'payment/result', component: PaymentResultComponent }, // Moved before parameterized route
  { path: 'payment/:checkoutId', component: PaymentScheduleComponent }, // Updated to use payment schedule (backward compatibility)
  { path: 'payment-form/:id', component: PaymentFormComponent },
  { path: 'payment-select/:id', component: PaymentSelectComponent },
  { path: 'payment-pending/:id', component: PaymentPendingComponent },
  { path: 'payment-company/:id', component: PaymentCompanyComponent },
  { path: 'adminLogin', component: AdminLogin},

  // { path: 'dashboard', component: Dashboard , 
  //    canActivate: [AuthGuard]
  //  },
  // { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: CustomerLoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'active-services', component: ActiveServices },
  { path: 'help-center', component: HelpCenter },
  { path: 'saved-card', component: SavedCard },
  { path: 'saved-card/add-card', component: AddCardComponent },
  { path: 'saved-cards', component: SavedCardsComponent }, // New Angular component

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
