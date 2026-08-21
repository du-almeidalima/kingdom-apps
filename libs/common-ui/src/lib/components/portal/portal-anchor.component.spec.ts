import { CdkPortalOutlet } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { PortalAnchorComponent } from './portal-anchor.component';
import { PortalService } from './portal.service';

@Component({ template: '<p>portal content</p>' })
class DummyPortalComponent {}

describe('PortalAnchorComponent', () => {
  beforeEach(() => MockBuilder(PortalAnchorComponent).keep(CdkPortalOutlet).keep(PortalService));

  it('registers its outlet with the PortalService on view init', () => {
    const fixture = MockRender(PortalAnchorComponent);
    const portalService = TestBed.inject(PortalService);

    // The service now holds a usable outlet: attaching through it renders into the anchor.
    const { ref } = portalService.attachComponent(DummyPortalComponent);
    fixture.detectChanges();

    expect(ngMocks.formatText(fixture)).toContain('portal content');
    ref.destroy();
  });
});
