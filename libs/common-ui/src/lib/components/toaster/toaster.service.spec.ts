import { ComponentRef } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { ToasterService } from './toaster.service';
import { ToasterContainerComponent } from './toaster-container.component';
import { AttachedComponent } from '../portal/portal.service';
import { PortalService } from '../portal/portal.service';

type Toast = { message: string; type?: string; durationMs?: number; icon?: string };

describe('ToasterService', () => {
  it('creates container when first show is called and pushes config', () => {
    const pushed: Toast[] = [];

    const fakeRef = { instance: { push: (c: Toast) => pushed.push(c) } } as unknown as ComponentRef<ToasterContainerComponent>;

    const fakeAttached: AttachedComponent<ToasterContainerComponent> = {
      ref: fakeRef,
      dispose: jest.fn(),
    };

    const attachMock = jest.fn().mockReturnValue(fakeAttached as AttachedComponent<ToasterContainerComponent>);

    const portalMock = { attachComponent: attachMock } as { attachComponent: <T>(c: ComponentType<T>) => AttachedComponent<T> };

  const svc = new ToasterService(portalMock as unknown as PortalService);
    svc.info('hello', 1000);

    expect(attachMock).toHaveBeenCalled();
    expect(pushed.length).toBe(1);
    expect(pushed[0]).toMatchObject({ message: 'hello', type: 'info' });
  });

  it('reuses attached container on subsequent calls', () => {
    const pushed: Toast[] = [];

    const fakeRef = { instance: { push: (c: Toast) => pushed.push(c) } } as unknown as ComponentRef<ToasterContainerComponent>;
    const fakeAttached: AttachedComponent<ToasterContainerComponent> = { ref: fakeRef, dispose: jest.fn() };

    const attachMock = jest.fn().mockReturnValue(fakeAttached as AttachedComponent<ToasterContainerComponent>);
    const portalMock = { attachComponent: attachMock } as { attachComponent: <T>(c: ComponentType<T>) => AttachedComponent<T> };

  const svc = new ToasterService(portalMock as unknown as PortalService);
    svc.success('a');
    svc.error('b');

    expect(attachMock).toHaveBeenCalledTimes(1);
    expect(pushed.map(p => p.message)).toEqual(['a', 'b']);
  });
});
