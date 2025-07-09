import { Component } from '@angular/core';
import { User } from '../../services/user';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-mail-management',
  imports: [FormsModule,CommonModule],
  templateUrl: './mail-management.html',
  styleUrls: ['./mail-management.scss',"../../../assets/css/admin-theme.css"]
})
export class MailManagement {
  loading = true; 
      private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
 id: string = '';
  subject: string = '';
  mailbody: string = '';





  constructor(private userService: User, private toastr: ToastrService, private styleLoader: StyleLoader) {}

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
    this.loadProfile();
  }

  loadProfile(): void {
    this.userService.getMail().subscribe(
      (res: any) => {
        this.id = res._id;
        this.subject = res.subject;
        this.mailbody = res.mailbody;
       

    
      },
      error => {
        console.error('Error loading profile:', error);
        this.toastr.error('Failed to load profile', 'Error');
      }
    );
  }






  save(): void {
  
    const payload = {
      id: this.id,
      subject: this.subject,
      mailbody: this.mailbody,
  
    };

  

    this.userService.updatemailbody(payload).subscribe(
      response => {
        this.toastr.success('mail saved successfully', 'Success');
        this.loadProfile(); // Reload the profile to update the UI
      },
      error => {
        this.toastr.error('Failed to save profile', 'Error');
        console.error('Error saving profile:', error);
      }
    );
  }

      ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
