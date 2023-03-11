import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { MaterialCdkModule } from './modules/material/material-cdk.module';
import { HeaderComponent } from './components/header/header.component';
import { HistoryDialogComponent } from './components/dialogs';
import { TerritoryIconTranslatorPipe } from './pipes/territory-icon-translator/territory-icon-translator.pipe';
import { VisitOutcomeToIconPipe } from './pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';

@NgModule({
  imports: [CommonModule, CommonComponentsModule, RouterLinkWithHref, RouterLinkActive, MaterialCdkModule],
  exports: [HeaderComponent, CommonComponentsModule, TerritoryIconTranslatorPipe, VisitOutcomeToIconPipe],
  providers: [VisitOutcomeToIconPipe],
  declarations: [HeaderComponent, HistoryDialogComponent, TerritoryIconTranslatorPipe, VisitOutcomeToIconPipe],
})
export class SharedModule {}
