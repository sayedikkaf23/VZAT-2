import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SalesForceService } from '../../services/salesforce.service';

@Component({
  selector: 'app-payment-schedule',
  templateUrl: './payment-schedule.component.html',
  styleUrls: [
    './payment-schedule.component.scss',
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/payment-schedual.css'
  ]
})
export class PaymentScheduleComponent implements AfterViewInit {

  salesAgent: { name: string; 
                position: String; 
                mobNo1: String; 
                mobNo2: String; 
                token: number;} = {name: "", 
                                   position: "", 
                                   mobNo1: "", 
                                   mobNo2: "", 
                                   token:0}

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
              private salesForceService: SalesForceService) {}

  
  ngOnInit(): void {
    this.getSalesForceDetails();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Dynamically load JS only for this component
      this.loadScript('assets/js/jquery-2.2.4.min.js');
      this.loadScript('assets/js/bootstrap.bundle.min.js');
      this.loadScript('assets/js/simplebar.min.js');
      this.loadScript('assets/js/select2.min.js');
      this.loadScript('assets/js/custom.js');
    }
  }

  private loadScript(src: string) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }

   getSalesForceDetails()  {
    this.salesForceService.getSalesForceDetails().subscribe({
      next: (res: any) => {
        console.log(res);
        this.salesAgent.name = res.name;
        this.salesAgent.position = res.position;
        this.salesAgent.mobNo1 = res.mobNo1;
        this.salesAgent.mobNo2 = res.mobNo2;
        this.salesAgent.token = res.token;
        console.log(this.salesAgent);
      },
      error: (err) => {
        this.salesAgent = {name: "", position: "", mobNo1: "", mobNo2: "", token:0};
      },
      complete: () => {},
    });
  }

}
