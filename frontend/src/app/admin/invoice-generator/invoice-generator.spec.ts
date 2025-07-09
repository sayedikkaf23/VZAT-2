import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceGenerator } from './invoice-generator';

describe('InvoiceGenerator', () => {
  let component: InvoiceGenerator;
  let fixture: ComponentFixture<InvoiceGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceGenerator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceGenerator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
