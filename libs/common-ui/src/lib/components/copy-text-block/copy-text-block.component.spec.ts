import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { Clipboard } from '@angular/cdk/clipboard';
import { CopyTextBlockComponent } from './copy-text-block.component';

describe('CopyTextBlockComponent', () => {
  const clipboardCopyMock = jest.fn().mockImplementation(() => Promise.resolve());

  beforeEach(() => {
    return MockBuilder(CopyTextBlockComponent).mock(Clipboard, {
      copy: clipboardCopyMock,
    });
  });

  it('should create', () => {
    const testText = 'Test content';
    const component = MockRender(CopyTextBlockComponent, { text: testText });
    expect(component.point.componentInstance).toBeTruthy();
  });

  it('should display the text content', () => {
    const testText = 'Test content';
    const component = MockRender(CopyTextBlockComponent, { text: testText });
    expect(component.nativeElement.textContent).toContain(testText);
  });

  it('should copy text when clicked', () => {
    const testText = 'Text to copy';
    MockRender(CopyTextBlockComponent, { text: testText });
    const button = ngMocks.find('.copy-text-block__button');
    ngMocks.click(button);

    expect(clipboardCopyMock).toHaveBeenCalledWith(testText);
  });
});
