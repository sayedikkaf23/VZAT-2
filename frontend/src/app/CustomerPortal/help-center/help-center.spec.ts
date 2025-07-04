import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpCenter } from './help-center';

describe('HelpCenter', () => {
  let component: HelpCenter;
  let fixture: ComponentFixture<HelpCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HelpCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
