import { CdkPortalOutlet, ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { ComponentRef, Injectable } from '@angular/core';

export type AttachedComponent<T> = {
  ref: ComponentRef<T>;
  dispose: () => void;
};

/**
 * Mounts a component into the application's portal outlet and returns
 * a handle with the component reference and a dispose helper.
 * The application outlet is set when using the {@link PortalAnchorComponent}.
 */
@Injectable({ providedIn: 'root' })
export class PortalService {
  /** The CDK portal outlet provided by the app anchor. */
  private outlet?: CdkPortalOutlet;

  /**
   * Attach a component to the portal outlet and return its reference.
   * @throws if no outlet has been set.
   */
  attachComponent<T>(component: ComponentType<T>): AttachedComponent<T> {
    if (!this.outlet) {
      throw new Error("No outlet found for attaching component. Is the PortalAnchorComponent added to the application?");
    }

    const portal = new ComponentPortal(component);
    const ref = this.outlet.attach(portal);

    const dispose = () => {
      try {
        // try to detach the portal and dispose the outlet
        this.outlet?.detach();
      } catch {
        this.outlet?.dispose();
      }
    };

    return { ref, dispose };
  }

  /** Set the CDK portal outlet used to attach components. */
  setOutlet(outlet: CdkPortalOutlet) {
    this.outlet = outlet;
  }
}
