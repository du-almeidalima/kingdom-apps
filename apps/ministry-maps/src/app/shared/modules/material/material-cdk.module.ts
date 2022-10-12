import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

@NgModule({
  declarations: [],
  imports: [CommonModule, DialogModule, OverlayModule, PortalModule],
  exports: [DialogModule, OverlayModule, PortalModule],
})
export class MaterialCdkModule {}
