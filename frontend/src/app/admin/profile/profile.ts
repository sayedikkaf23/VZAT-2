import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { User } from '../../services/user';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { StyleLoader} from '../../services/style-loader';

@Component({
  standalone:true,
  selector: 'app-profile',
  imports: [FormsModule,CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss','../../../assets/css/admin-theme.css', "../../../assets/css/style-admin.css"]
})
export class Profile {

   @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;


  selectedImage: string | null = null;
  fileName: string | null = null;
  selectedImageFile: File | null = null; // Store the selected file
  salesPersonName: string = '';
  Notes: string = '';
  profileId: string = '';
  bankDetails: string = '';
  Termsandcondition: string = '';
  logoUrl: string = ''; // To hold the logo URL if there is any

  constructor(private userService: User,private styleLoader: StyleLoader, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadProfile();

  }

  loadProfile(): void {
    this.userService.getProfile().subscribe(
      (profile: any) => {
        this.profileId = profile._id;
        this.salesPersonName = profile.salesPersonName;
        this.Notes = profile.notes;
        this.bankDetails = profile.bankDetails;
        this.Termsandcondition = profile.termsAndConditions;
        this.logoUrl = profile.logo;

        if (this.logoUrl) {
          this.selectedImage = this.logoUrl;
          // this.fileName = this.logoUrl.split('/').pop();
        }
      },
      error => {
        console.error('Error loading profile:', error);
        this.toastr.error('Failed to load profile', 'Error');
      }
    );
  }

  triggerFileInput(): void {
    console.log('File input:', this.fileInput);
    if (this.fileInput && this.fileInput.nativeElement) {
      console.log('Triggering file input');
      this.fileInput.nativeElement.click();
    } else {
      console.error('File input is not available.');
    }
  }
  

  onSelect(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      this.fileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.fileName = null;
    this.selectedImage = null;
    this.selectedImageFile = null;
    this.fileInput.nativeElement.value = ''; // Clear the file input
  }

  save(): void {
    const formData = new FormData();
    const payload = {
      profileId: this.profileId,
      salesPersonName: this.salesPersonName,
      notes: this.Notes,
      bankDetails: this.bankDetails,
      termsAndConditions: this.Termsandcondition
    };

    for (const key in payload) {
      if (payload.hasOwnProperty(key)) {
        // formData.append(key, payload[key]);
      }
    }

    if (this.selectedImageFile) {
      formData.append('logo', this.selectedImageFile, this.selectedImageFile.name);
    }

    this.userService.updateProfile(formData).subscribe(
      response => {
        this.toastr.success('Profile saved successfully', 'Success');
        this.loadProfile(); // Reload the profile to update the UI
      },
      error => {
        this.toastr.error('Failed to save profile', 'Error');
        console.error('Error saving profile:', error);
      }
    );
  }
}
