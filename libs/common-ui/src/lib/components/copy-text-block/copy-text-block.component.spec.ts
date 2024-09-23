import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CopyTextBlockComponent } from './copy-text-block.component';

describe('CopyTextBlockComponent', () => {
  let component: CopyTextBlockComponent;
  let fixture: ComponentFixture<CopyTextBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyTextBlockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CopyTextBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
