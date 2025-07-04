import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedCard } from './saved-card';

describe('SavedCard', () => {
  let component: SavedCard;
  let fixture: ComponentFixture<SavedCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
