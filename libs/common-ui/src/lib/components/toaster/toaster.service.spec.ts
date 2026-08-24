import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToasterService } from './toaster.service';
import { ToasterContainerComponent } from './toaster-container.component';
import { AttachedComponent, PortalService } from '../portal/portal.service';

type Toast = { message: string; type?: string; durationMs?: number; icon?: string };

describe('ToasterService', () => {
  let pushed: Toast[];
  let attachMock: jest.Mock;

  beforeEach(() => {
    pushed = [];

    const fakeRef = {
      instance: { push: (c: Toast) => pushed.push(c) },
    } as unknown as ComponentRef<ToasterContainerComponent>;
    const fakeAttached: AttachedComponent<ToasterContainerComponent> = { ref: fakeRef, dispose: jest.fn() };
    attachMock = jest.fn().mockReturnValue(fakeAttached as AttachedComponent<ToasterContainerComponent>);

    TestBed.configureTestingModule({
      providers: [ToasterService, { provide: PortalService, useValue: { attachComponent: attachMock } }],
    });
  });

  it('creates container when first show is called and pushes config', () => {
    const svc = TestBed.inject(ToasterService);
    svc.info('hello', 1000);

    expect(attachMock).toHaveBeenCalled();
    expect(pushed.length).toBe(1);
    expect(pushed[0]).toMatchObject({ message: 'hello', type: 'info' });
  });

  it('reuses attached container on subsequent calls', () => {
    const svc = TestBed.inject(ToasterService);
    svc.success('a');
    svc.error('b');

    expect(attachMock).toHaveBeenCalledTimes(1);
    expect(pushed.map((p) => p.message)).toEqual(['a', 'b']);
  });
});
