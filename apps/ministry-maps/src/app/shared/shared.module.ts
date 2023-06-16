import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { MaterialCdkModule } from './modules/material/material-cdk.module';
import { HeaderComponent } from './components/header/header.component';
import { HistoryDialogComponent } from './components/dialogs';
import { TerritoryIconTranslatorPipe } from './pipes/territory-icon-translator/territory-icon-translator.pipe';
import { VisitOutcomeToIconPipe } from './pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { IconRadioComponent } from './components/visit-outcome-option/icon-radio.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, FormsModule, CommonComponentsModule, RouterLinkWithHref, RouterLinkActive, MaterialCdkModule],
  providers: [VisitOutcomeToIconPipe],
  exports: [
    HeaderComponent,
    CommonComponentsModule,
    TerritoryIconTranslatorPipe,
    VisitOutcomeToIconPipe,
    IconRadioComponent,
  ],
  declarations: [
    HeaderComponent,
    HistoryDialogComponent,
    TerritoryIconTranslatorPipe,
    VisitOutcomeToIconPipe,
    IconRadioComponent,
  ],
})
export class SharedModule {}
