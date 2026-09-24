import { CdkPortalOutlet } from '@angular/cdk/portal';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { PortalService } from './portal.service';

/**
 * Anchor component for the Portal. It doesn't render the UI itself because the toaster
 * renders into document.body via Angular CDK Portal.
 */
@Component({
  selector: 'lib-portal-anchor',
  standalone: true,
  imports: [CdkPortalOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-template cdkPortalOutlet />',
})
export class PortalAnchorComponent implements AfterViewInit {
  portalService = inject(PortalService);

  portalOutlet = viewChild.required(CdkPortalOutlet);

  ngAfterViewInit(): void {
    this.portalService.setOutlet(this.portalOutlet());
  }
}
