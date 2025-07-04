import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveServices } from './active-services';

describe('ActiveServices', () => {
  let component: ActiveServices;
  let fixture: ComponentFixture<ActiveServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveServices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
