import { Component,Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StyleLoader} from '../../services/style-loader';

// Define an interface that matches the structure of your sidebarData
interface SalesAgent {
  name: string;
  position: string;
  phoneNumbers: {
    office: string;
    mobile: string;
  };
  email: string;
}

interface SidebarData {
  salesAgent?: SalesAgent; // Make it optional if it might not always be there
  // ... other properties of sidebarData
}

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})


export class Footer {
 
 @Input() sidebarData: SidebarData | undefined; // Or initialize it: = {};

  constructor(  private styleLoader: StyleLoader) { }

  ngOnInit(): void {

    // If sidebarData is fetched asynchronously, ensure its assignment
    // For example: this.someService.getData().subscribe(data => this.sidebarData = data);
  }
}
