import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SalesAgent {
  name: string;
  position: string;
  faxNumber: string;
  phoneNumber: string;
  email: string;
  mobNo1?: string;
  mobNo2?: string;
  token?: number;
}

@Component({
  selector: 'app-sales-agent-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-agent-sidebar.component.html',
  styleUrls: ['./sales-agent-sidebar.component.scss']
})
export class SalesAgentSidebarComponent {
  @Input() salesAgent!: SalesAgent;
  @Input() title: string = 'Need Assistance?';
  @Input() subtitle: string = 'Contact your sales agent:';
  @Input() showTitle: boolean = true;
  @Input() showSubtitle: boolean = true;
}
