import { CdkPortalOutlet, ComponentType } from '@angular/cdk/portal';
import { ComponentRef } from '@angular/core';
import { PortalService } from './portal.service';

class DummyComponent {}

describe('PortalService', () => {
  it('throws when no outlet is set', () => {
    const svc = new PortalService();
    expect(() => svc.attachComponent(DummyComponent as ComponentType<unknown>)).toThrow(/No outlet found/);
  });

  it('attaches component and returns ref + dispose that calls detach', () => {
    const svc = new PortalService();

    const fakeRef = { instance: { foo: 'bar' } } as unknown as ComponentRef<unknown>;
    const outlet: Partial<CdkPortalOutlet> = {
      attach: jest.fn().mockReturnValue(fakeRef),
      detach: jest.fn(),
      dispose: jest.fn(),
    };

    svc.setOutlet(outlet as CdkPortalOutlet);

    const handle = svc.attachComponent(DummyComponent as ComponentType<unknown>);
    expect(handle.ref).toBe(fakeRef);

    // dispose should call detach when detach does not throw
    handle.dispose();
    expect(outlet.attach).toHaveBeenCalled();
    expect(outlet.detach).toHaveBeenCalled();
    expect(outlet.dispose).not.toHaveBeenCalled();
  });

  it('dispose falls back to outlet.dispose when detach throws', () => {
    const svc = new PortalService();

    const fakeRef = { instance: {} } as unknown as ComponentRef<unknown>;
    const outlet: Partial<CdkPortalOutlet> = {
      attach: jest.fn().mockReturnValue(fakeRef),
      detach: jest.fn().mockImplementation(() => {
        throw new Error('detach failed');
      }),
      dispose: jest.fn(),
    };

    svc.setOutlet(outlet as CdkPortalOutlet);

    const handle = svc.attachComponent(DummyComponent as ComponentType<unknown>);
    handle.dispose();

    expect(outlet.attach).toHaveBeenCalled();
    expect(outlet.detach).toHaveBeenCalled();
    // since detach threw, dispose should be called
    expect(outlet.dispose).toHaveBeenCalled();
  });
});
