import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigationPanel } from './navigation-panel';

describe('NavigationPanel', () => {
  let component: NavigationPanel;
  let fixture: ComponentFixture<NavigationPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigationPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
