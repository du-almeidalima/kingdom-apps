import { CdkPortalOutlet } from '@angular/cdk/portal';
import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { PortalService } from './portal.service';

/**
 * Anchor component for the Portal. It doesn't render the UI itself because the toaster
 * renders into document.body via Angular CDK Portal.
 */
@Component({
  selector: 'lib-portal-anchor',
  standalone: true,
  imports: [CdkPortalOutlet],
  template: '<ng-template cdkPortalOutlet />',
})
export class PortalAnchorComponent implements AfterViewInit {
  portalService = inject(PortalService);

  @ViewChild(CdkPortalOutlet) portalOutlet!: CdkPortalOutlet;

  ngAfterViewInit(): void {
    this.portalService.setOutlet(this.portalOutlet);
  }
}
