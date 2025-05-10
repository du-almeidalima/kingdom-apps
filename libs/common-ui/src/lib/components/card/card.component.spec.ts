import { CardComponent } from './card.component';
import { MockBuilder, MockRender } from 'ng-mocks';

describe('CardComponent', () => {
  beforeEach(() => {
    return MockBuilder(CardComponent);
  });

  test('should render card', () => {
    const text = `<h1>This text should be projected</h1>`;
    const component = MockRender(`<lib-card>${text}</lib-card>`);

    const textHeading = component.nativeElement.querySelector('h1');
    expect(textHeading).toBeTruthy();
  });
});
