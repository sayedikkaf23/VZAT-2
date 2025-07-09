import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualInvoicePayment } from './manual-invoice-payment';

describe('ManualInvoicePayment', () => {
  let component: ManualInvoicePayment;
  let fixture: ComponentFixture<ManualInvoicePayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualInvoicePayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManualInvoicePayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
