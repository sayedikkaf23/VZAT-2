import { Component } from '@angular/core';
import { User } from '../../services/user';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mail-management',
  imports: [FormsModule,CommonModule],
  templateUrl: './mail-management.html',
  styleUrls: ['./mail-management.scss',"../../../assets/css/admin-theme.css"]
})
export class MailManagement {
 id: string = '';
  subject: string = '';
  mailbody: string = '';





  constructor(private userService: User, private toastr: ToastrService) {}

  ngOnInit(): void {
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
}
