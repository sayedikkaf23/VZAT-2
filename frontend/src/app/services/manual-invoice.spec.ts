import { TestBed } from '@angular/core/testing';

import { ManualInvoice } from './manual-invoice';

describe('ManualInvoice', () => {
  let service: ManualInvoice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManualInvoice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
