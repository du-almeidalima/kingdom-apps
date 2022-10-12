import { Pipe, PipeTransform } from '@angular/core';
import { TerritoryIcon } from '../../../models/territory';

@Pipe({
  name: 'territoryIconTranslator',
})
export class TerritoryIconTranslatorPipe implements PipeTransform {
  transform(value: TerritoryIcon): string {
    switch (value) {
      case TerritoryIcon.MAN:
        return 'Homem';
      case TerritoryIcon.WOMAN:
        return 'Mulher';
      case TerritoryIcon.CHILD:
        return 'Criança/Jovem';
      case TerritoryIcon.OTHER:
        return 'Outro';
    }
  }
}
