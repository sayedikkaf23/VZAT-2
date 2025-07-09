import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Auth } from '../../services/auth';
import { Role } from '../../services/role';
import { ACCESS } from './access';
import { CommonModule } from '@angular/common'; // <--- ADD THIS for *ngIf, *ngFor
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-role-add',
  imports: [CommonModule,FormsModule],
  templateUrl: './role-add.html',
  styleUrls: ['./role-add.scss',"../../../assets/css/admin-theme.css"]
})
export class RoleAdd {

    accessList: any = ACCESS;

  checked: any;
  allChecked: boolean = false;

  selectedRole: any;
  roleTypes: any = [];

  storeId: any;
  selectedStoreId: any;
  selectedStoreName: any;
  allStores: any = [];

  permissions: any = [];

  status: any = ['Active', 'In Active'];
  selectedStatus: any;

  roleDetails: any = {};

  storeName: any;
  type: any = 'add';
  roleId: any;
  isView: boolean = false;
  editStoreId: any;
  editRolePermission: any;
  loginType: any;
  stores: any;
  roles: any;
  constructor(
    private router: Router,
    private toaster: ToastrService,
    private authService: Auth,
    private route: ActivatedRoute,
    private roleService: Role
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('type')) {
      this.type = this.route.snapshot.queryParamMap.get('type');
    }

    this.roleId = this.route.snapshot.queryParamMap.get('roleId');

    if (this.roleId) {
      this.getRoleById();
    } else {
      // this.setAccessList();
      // this.checkedAllPermissions(true);
    }
    this.isView = this.type ***REMOVED*** 'view';
  }

  setAccessList() {
    this.accessList.map((obj:any) => {
      obj.checked = false;
      return obj;
    });
  }

  getRoleById() {
    this.roleService.getRoleById(this.roleId).subscribe({
      next: (res: any) => {
        this.setRole(res?.data);
        // this.editRolePermission = res?.role?.permissions;
        this.setPermissionChecked(res?.data?.permissions);
      },
      error: (err) => {},
      complete: () => {},
    });
  }

  setPermissionChecked(permissions: any) {
    this.accessList.forEach((childLvl1: any) => {
      childLvl1.checked = permissions.includes(childLvl1.name);
      if (childLvl1.checked) {
        this.permissions.push(childLvl1.name);
      }
    });
  }

  setRole(role: any) {
    if (this.type ***REMOVED*** 'view' || this.type ***REMOVED*** 'edit') {
      this.roleDetails.role_name = role?.role_name;

      if (role?.status) {
        this.selectedStatus = 'Active';
      }
      if (!role?.status) {
        this.selectedStatus = 'In Active';
      }
    }
  }

  checkedAllPermissions(check = this.allChecked) {
    let checkedList = this.accessList.filter((a:any) => a.checked ***REMOVED*** true);
    if (checkedList?.length) {
      check = false;
    } else {
      check = true;
    }
    this.accessList.forEach((childLvl1: any) => {
      childLvl1.checked = check;
      if (check) {
        this.permissions.push(childLvl1?.name);
      } else if (!check) {
        this.permissions.pop();
      }
    });
    this.allChecked = !this.allChecked;
    if (!this.allChecked) {
      this.permissions = [];
    }
  }

  onCheckedPermissions($event: any, parent: any, childLvl2: any) {
    parent.checked = $event.target.checked;

    let child: any = parent?.child;

    let children: any = parent?.children;

    if (!childLvl2?.checked && childLvl2) {
      this.toaster.error(`Please Select ${childLvl2?.name}`);
      return;
    }
    if (parent?.checked) {
      this.permissions.push(parent?.name);
    } else {
      const idx = this.permissions.findIndex((p:any) => p ***REMOVED***= parent?.name);
      this.permissions.splice(idx, 1);
    }

    if (child?.checked) {
      parent?.child.forEach((childLvl1: any) => {
        this.permissions.push(childLvl1.name);
      });
    }
    if (parent && children) {
      this.setParentChildrenChecked(parent, children);
    }
  }

  setParentChildrenChecked(parent: any, children: any) {
    if (parent?.checked && children) {
      children.forEach((childLvl2:any) => {
        childLvl2.checked = true;
        this.permissions.push(childLvl2.name);
      });
    }
    if (children && !parent.checked) {
      children.forEach((childLvl2:any) => {
        childLvl2.checked = false;
        const idx = this.permissions.findIndex((p:any) => p ***REMOVED***= childLvl2?.name);
        this.permissions.splice(idx, 1);
      });
    }
  }

  addRole() {
    if (!this.permissions?.length) {
      this.toaster.error('Please Choose Permission!');
      return;
    }

    if (!this.roleDetails.role_name) {
      this.toaster.error('Please Enter Role Name!');
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

    let payload: any;

    payload = {
      role_name: this.roleDetails?.role_name,
      permissions: this.permissions,
      status,
    };

    if (this.roleId && this.type ***REMOVED*** 'edit') {
      this.roleService.updateRole(this.roleId, payload).subscribe({
        next: (res: any) => {
          this.router.navigate(['/panel/roles']);
        },
        error: (err) => {},
        complete: () => {},
      });
    } else {
      this.roleService.addRole(payload).subscribe({
        next: (res: any) => {
          this.router.navigate(['/panel/roles']);
        },
        error: (err: any) => {},
        complete: () => {},
      });
    }
  }

  ngOnDestroy() {
    this.permissions = [];
  }
}
