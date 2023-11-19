import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CdkMenuModule } from '@angular/cdk/menu';

@NgModule({
  declarations: [],
  imports: [CommonModule, DialogModule, OverlayModule, PortalModule, CdkMenuModule],
  exports: [DialogModule, OverlayModule, PortalModule, CdkMenuModule],
})
export class MaterialCdkModule {}
