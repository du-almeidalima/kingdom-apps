import { Pipe, PipeTransform } from '@angular/core';

import { Icons } from '@kingdom-apps/common-ui';

import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';

@Pipe({
  name: 'visitOutcomeToIcon'
})
export class VisitOutcomeToIconPipe implements PipeTransform {

  transform(value: VisitOutcomeEnum): Icons {
    switch (value) {
      case VisitOutcomeEnum.SPOKE:
        return 'thumb-10';
      case VisitOutcomeEnum.NOT_ANSWERED:
        return 'thumb-12';
      case VisitOutcomeEnum.MOVED:
        return 'building-8';
      case VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN:
        return 'stop-2';
      case VisitOutcomeEnum.REVISIT:
        return 'speech-bubble-26'
    }
  }
}
