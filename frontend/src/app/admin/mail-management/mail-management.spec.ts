import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MailManagement } from './mail-management';

describe('MailManagement', () => {
  let component: MailManagement;
  let fixture: ComponentFixture<MailManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MailManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MailManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
