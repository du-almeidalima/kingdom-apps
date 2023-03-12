import { TerritoryIcon } from '../../../models/territory';
import { Icons } from '@kingdom-apps/common-ui';

const mapTerritoryIcon = (territoryIcon: TerritoryIcon): Icons => {
  switch (territoryIcon) {
    case TerritoryIcon.MAN:
      return 'generation-3';
    case TerritoryIcon.WOMAN:
      return 'generation-12';
    case TerritoryIcon.COUPLE:
      return 'generation-couple';
    case TerritoryIcon.CHILD:
      return 'generation-7';
    default:
      return 'generation-3';
  }
};
const isIconLarge = (icon: Icons) => {
  return icon === 'generation-couple';
}

export default mapTerritoryIcon;
export { isIconLarge };
