import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Role } from '../../services/role';
import { CommonModule } from '@angular/common'; // <--- ADD THIS for *ngIf, *ngFor
import { FormsModule } from '@angular/forms'; 
import { DateFormatPipe } from '../../../assets/pipes/date-format.pipe'; 

@Component({
  selector: 'app-role-list',
  imports: [CommonModule, FormsModule, RouterModule,DateFormatPipe],
  templateUrl: './role-list.html',
  styleUrls: ['./role-list.scss',  '../../../assets/css/admin-theme.css']
})
export class RoleList {

   storeId: any;
  roleLists: any = [];
  page: any;
  total_page: any;
  total_pages: any =[];
  updateStatus: any;

  selectedroleList: any = '';
  loginType: any;
  stores: any;
  pageLimit: any;
  searchTerm: any = '';

  sortOrder: { column: string; direction: 'asc' | 'desc' } = {
    column: '',
    direction: 'asc',
  };

  constructor(private roleService: Role, private router: Router) {}

  ngOnInit(): void {
    this.page = 1;
    this.getRoleLists(this.page);
  }

  getRoleLists(page: any) {
    this.page = page;
    this.roleService.getRoles(this.page, this.pageLimit).subscribe({
      next: (res: any) => {
        this.roleLists = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x: any, i: number) => i)
          .map((x: any, i: number) => i + 1);
      },
      error: (err: any) => {
        this.roleLists = [];
      },
      complete: () => {},
    });
  }

  onChangePageLimit() {
    this.getRoleLists(this.page);
  }

  editRole(roleList: any, type: any) {
    this.router.navigate(['/panel/add_role'], {
      queryParams: {
        type,
        roleId: roleList?._id,
      },
    });
  }

  deleteRole(roleList: any) {
    if (
      window.confirm(`Are sure you want to delete ${roleList?.role_name} ?`)
    ) {
      const payload = {
        roleId: roleList?._id,
      };

      this.roleService.deleteRole(payload).subscribe({
        next: (res: any) => {
          this.getRoleLists(this.page);
        },
        error: () => {},
        complete: () => {},
      });
    }
  }

  viewRole(roleList: any, type: any) {
    this.router.navigate(['/panel/add_role'], {
      queryParams: {
        type,
        roleId: roleList?._id,
      },
    });
  }

  onRoleStatusChange(role: any, event: any) {
    if (role?._id) {
      this.roleService
        .updateRoleStatus({
          status: role?.status,
          roleId: role?._id,
        })
        .subscribe({
          next: () => {},
          error: (err: any) => {},
          complete: () => {},
        });
    }
  }

  onRoleSearch() {
    if (this.searchTerm) {
      this.searchRoles();
    } else {
      this.resetSearchAndFetchRoles();
    }
  }

  searchRoles() {
    this.roleService
      .searchRole({
        searchTerm: this.searchTerm,
      })
      .subscribe((res: any) => {
        this.roleLists = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x: any, i: any) => i)
          .map((x, i) => i + 1);
      });
  }

  resetSearchAndFetchRoles() {
    this.getRoleLists(1);
  }

  sortColumn(column: string) {
    if (this.sortOrder.column === column) {
      // Toggle sorting direction if the same column is clicked
      this.sortOrder.direction =
        this.sortOrder.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Set default sorting direction for a new column
      this.sortOrder.column = column;
      this.sortOrder.direction = 'asc';
    }

    // Perform sorting based on the selected column and direction
    this.roleLists.sort((a: any, b:any) => {
      const aValue = a[column];
      const bValue = b[column];

      if (aValue < bValue) {
        return this.sortOrder.direction === 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        return this.sortOrder.direction === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }

}
