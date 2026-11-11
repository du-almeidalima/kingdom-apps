import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { BottomSheetComponent } from './bottom-sheet.component';
import { DialogFooterComponent } from '../dialog/dialog-footer/dialog-footer.component';

@Component({
  template: `
    <lib-bottom-sheet title="Termos">
      <p data-testid="sheet-body">Conteúdo</p>
      <lib-dialog-footer>
        <button data-testid="sheet-accept">Aceitar</button>
      </lib-dialog-footer>
    </lib-bottom-sheet>
  `,
  imports: [BottomSheetComponent, DialogFooterComponent],
})
class HostComponent {}

describe('BottomSheetComponent', () => {
  let notifyIntersection: (isIntersecting: boolean) => void;
  let disconnectObserver: jest.Mock;

  beforeEach(() => {
    disconnectObserver = jest.fn();

    class IntersectionObserverStub {
      observe = jest.fn();
      disconnect = disconnectObserver;

      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = (isIntersecting) =>
          callback([{ isIntersecting }] as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
      }
    }
    window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

    return MockBuilder([BottomSheetComponent, DialogFooterComponent, HostComponent]).mock(DialogRef);
  });

  it('projects body content above the sticky footer slot', () => {
    const fixture = MockRender(HostComponent);
    const content = ngMocks.find(fixture, '[data-testid="bottom-sheet-content"]').nativeElement as HTMLElement;
    const footer = ngMocks.find(fixture, 'lib-dialog-footer').nativeElement as HTMLElement;

    expect(content.querySelector('[data-testid="sheet-body"]')).not.toBeNull();
    expect(footer.querySelector('[data-testid="sheet-accept"]')).not.toBeNull();
    expect(content.contains(footer)).toBe(false);
  });

  it('closes its DialogRef from the close button', () => {
    const fixture = MockRender(BottomSheetComponent);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="bottom-sheet-close"]'));

    expect(ngMocks.get(DialogRef).close).toHaveBeenCalledTimes(1);
  });

  it('hides the close button when the sheet is not closable', () => {
    const fixture = MockRender(BottomSheetComponent, { closable: false });

    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-close"]')).toHaveLength(0);
  });

  it('keeps the reading gate closed and shows the hint until the sentinel is visible', () => {
    const fixture = MockRender(BottomSheetComponent);
    const component = fixture.point.componentInstance;

    notifyIntersection(false);
    fixture.detectChanges();

    expect(component.reachedBottom()).toBe(false);
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-scroll-hint"]')).toHaveLength(1);

    notifyIntersection(true);
    fixture.detectChanges();

    expect(component.reachedBottom()).toBe(true);
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-scroll-hint"]')).toHaveLength(0);
  });

  it('stays open once the end was reached, even after scrolling back up', () => {
    const fixture = MockRender(BottomSheetComponent);

    notifyIntersection(true);
    fixture.detectChanges();
    notifyIntersection(false);
    fixture.detectChanges();

    expect(fixture.point.componentInstance.reachedBottom()).toBe(true);
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-scroll-hint"]')).toHaveLength(0);
  });

  it('opens the gate without a hint when the content fits the sheet', () => {
    const fixture = MockRender(BottomSheetComponent);

    notifyIntersection(true);
    fixture.detectChanges();

    expect(fixture.point.componentInstance.reachedBottom()).toBe(true);
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-scroll-hint"]')).toHaveLength(0);
  });

  it('smoothly scrolls the content to its end when the hint is clicked', () => {
    const fixture = MockRender(BottomSheetComponent);
    const content = ngMocks.find(fixture, '[data-testid="bottom-sheet-content"]').nativeElement as HTMLElement;
    const scrollTo = jest.fn();
    content.scrollTo = scrollTo;
    Object.defineProperty(content, 'scrollHeight', { value: 480 });

    notifyIntersection(false);
    fixture.detectChanges();
    ngMocks.click(ngMocks.find(fixture, '[data-testid="bottom-sheet-scroll-hint"]'));

    expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'smooth' });
  });

  it('disconnects the intersection observer when destroyed', () => {
    const fixture = MockRender(BottomSheetComponent);

    fixture.destroy();

    expect(disconnectObserver).toHaveBeenCalledTimes(1);
  });
});
