import { ComponentFixture } from '@angular/core/testing';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(() => {
    return MockBuilder(IconComponent);
  });

  beforeEach(() => {
    fixture = MockRender(IconComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set icon input property', () => {
    const testIcon = 'check-mark-circle-thin';
    component.icon = testIcon;
    fixture.detectChanges();

    const iconElement = ngMocks.find('use');
    expect(iconElement.attributes['href']).toContain(testIcon);
  });
});
