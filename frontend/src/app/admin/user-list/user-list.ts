import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user';
import { FormsModule } from '@angular/forms';
import { DateFormatPipe } from '../../../assets/pipes/date-format.pipe'; 
import { StyleLoader } from '../../services/style-loader';

@Component({
  standalone: true,
  selector: 'app-user-list',
  imports: [CommonModule, RouterModule, FormsModule, DateFormatPipe],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss','../../../assets/css/admin-theme.css']
})
export class UserList {
      private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
userList: any = [];
loading = true; 
  page: any;
  total_page: any;
  total_pages: any =[];
  updateStatus: any;

  selectedroleList: any = '';
  stores: any;
  pageLimit: any;
  searchTerm: any = '';

  sortOrder: { column: string; direction: 'asc' | 'desc' } = {
    column: '',
    direction: 'asc',
  };

  constructor(private userService: User,private styleLoader:StyleLoader, private router: Router) {}

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
    this.page = 1;
    this.getUsers(this.page);
  }

  getUsers(page = 1) {
    this.page = page;
    this.userService.getUsers(this.page, this.pageLimit).subscribe({
      next: (res: any) => {
        this.userList = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x:any, i:any) => i)
          .map((x, i) => i + 1);
      },
      error: (err:any) => {
        this.userList = [];
      },
      complete: () => {},
    });
  }

  onChangePageLimit() {
    this.getUsers();
  }

  editUser(user: any, type: any) {
    this.router.navigate(['/panel/add_user'], {
      queryParams: {
        type,
        userId: user?._id,
      },
    });
  }

  deleteUser(user: any) {
    if (window.confirm(`Are sure you want to delete ${user?.user_name} ?`)) {
      const payload = {
        userId: user?._id,
      };

      this.userService.deleteUser(payload).subscribe({
        next: (res: any) => {
          this.getUsers(this.page);
        },
        error: () => {},
        complete: () => {},
      });
    }
  }

  viewUser(user: any, type: any) {
    this.router.navigate(['/panel/add_user'], {
      queryParams: {
        type,
        userId: user?._id,
      },
    });
  }

  onUserStatusChange(user: any, event: any) {
    console.log(user)
    if (user?._id) {
      this.userService
        .updateUserStatus({
          status: user?.status,
          userId: user?._id,
          name: user?.name,
        })
        .subscribe({
          next: (res: any) => {},
          error: (err:any) => {},
          complete: () => {},
        });
    }
  }

  onUserSearch() {
    if (this.searchTerm) {
      this.searchUsers();
    } else {
      this.resetSearchAndFetchUsers();
    }
  }

  searchUsers() {
    this.userService
      .searchUser({
        searchTerm: this.searchTerm,
      })
      .subscribe((res: any) => {
        this.userList = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x:any, i:any) => i)
          .map((x, i) => i + 1);
      });
  }

  resetSearchAndFetchUsers() {
    this.page = 1;
    this.getUsers();
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
    this.userList.sort((a:any, b:any) => {
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

   ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
