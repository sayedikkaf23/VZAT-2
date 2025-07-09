import { TestBed } from '@angular/core/testing';

import { StyleLoader } from './style-loader';

describe('StyleLoader', () => {
  let service: StyleLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StyleLoader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
