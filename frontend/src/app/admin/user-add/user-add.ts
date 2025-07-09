import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { NgSelectModule } from '@ng-select/ng-select'; 
import { StyleLoader } from '../../services/style-loader';

import { User } from '../../services/user';
import { Role } from '../../services/role';
@Component({
  selector: 'app-user-add',
  imports: [CommonModule,FormsModule, NgSelectModule],
  templateUrl: './user-add.html',
  styleUrls: ['./user-add.scss',"../../../assets/css/admin-theme.css"]
})
export class UserAdd {
      private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
  loading = true; 
   type: any = 'add';
  userId: any;
  storeId: any;
  email: any = '';
  password: any = '';
  userName: any = '';
  contactNo: any = '';
  roles: any = [];
  selectedRole: any;
  loginCode: any;
  isEdit: any = false;
  storeAccessList: any = [];
  allChecked: boolean = false;
  oldPassword: any;
  checkedStoreIds: any;
  isMaster: any = false;

  statusList: any = ['Active', 'In Active'];
  selectedStatus: any;

  constructor(
    private route: ActivatedRoute,
    private userService: User,
    private roleService: Role,
    private toaster: ToastrService,
    private styleLoader:StyleLoader,
    private router: Router
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
    if (this.route.snapshot.queryParamMap.get('type')) {
      this.type = this.route.snapshot.queryParamMap.get('type');
    }

    this.userId = this.route.snapshot.queryParamMap.get('userId');

    if (this.userId) {
      this.getUserById();
    }

    this.getRoles();
  }

  getRoles() {
    this.roleService.getRoles(0, '', false).subscribe((res: any) => {
      if (res.success) {
        this.roles = res?.data;
      }
    });
  }

  getUserById() {
    this.userService.getUserById(this.userId).subscribe({
      next: (res: any) => {
        this.setUser(res?.data);
      },
      error: (err:any) => {},
      complete: () => {},
    });
  }

  setUser(user: any) {
    if (this.type == 'view' || this.type == 'edit') {
      this.email = user?.email;
      this.oldPassword = user?.password;
      this.userName = user?.user_name;
      this.contactNo = user?.contact_number;
      this.selectedRole = user?.role_id;
      this.loginCode = user?.login_code;

      if (user?.status) {
        this.selectedStatus = 'Active';
      }
      if (!user?.status) {
        this.selectedStatus = 'In Active';
      }
    }
  }

  checkedAllStores(check = this.allChecked) {
    if (this.allChecked) {
      check = true;
    } else {
      check = false;
    }
    this.storeAccessList.forEach((childLvl1: any) => {
      childLvl1.checked = check;
    });
    this.allChecked = !this.allChecked;
  }

  onCheckedStores($event: any, store: any) {
    store.checked = $event.target.checked;
  }

  onCheckedMaster($event: any) {
    this.allChecked = $event.target.checked;
    this.checkedAllStores(this.allChecked);
  }

  generateLoginCode() {
    this.loginCode = Math.floor(Math.random() * 90000) + 10000;
  }

  setAccessListChecked(stores: any) {
    if (this.storeAccessList?.length) {
      this.storeAccessList.forEach((str: any) => {
        str.checked = stores.includes(str?._id);
      });
    }
  }

  addUser() {
    if (!this.email) {
      this.toaster.error('Please Enter Email!');
      return;
    }

    if (!this.password && this.type == 'add') {
      this.toaster.error('Please Enter Password!');
      return;
    }

    if (!this.oldPassword && this.type == 'edit' && !this.password) {
      this.toaster.error('Please Enter Password!');
      return;
    }

    if (!this.userName) {
      this.toaster.error('Please Enter UserName!');
      return;
    }

    if (!this.contactNo) {
      this.toaster.error('Please Enter Contact Number!');
      return;
    }

    if (!this.selectedRole) {
      this.toaster.error('Please Select Role!');
      return;
    }

    let status: any;

    switch (this.selectedStatus) {
      case 'Active':
        status = true;
        break;

      case 'In Active':
        status = false;
        break;
    }

    let payload;

    payload = {
      role_id: this.selectedRole,
      email: this.email,
      user_name: this.userName,
      contact_number: this.contactNo,
      status,
    };

    if (this.password) {
      payload = {
        ...payload,
        password: this.password,
      };
    }

    if (this.userId && this.type == 'edit') {
      this.userService.updateUser(this.userId, payload).subscribe({
        next: (res: any) => {
          this.router.navigate(['/panel/users']);
        },
        error: (err: any) => {},
        complete: () => {},
      });
    } else {
      this.userService.addUser(payload).subscribe({
        next: (res: any) => {
          this.router.navigate(['/panel/users']);
        },
        error: (err: any) => {},
        complete: () => {},
      });
    }
  }
   ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
