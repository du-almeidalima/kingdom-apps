import { amber600, blue600, Icons } from '@kingdom-apps/common-ui';

import { NotificationCategoryEnum } from '../../../../models/enums/notification-category';

export type NotificationCategoryPreset = { label: string; icon: Icons; accent: string };

export const NOTIFICATION_CATEGORY_PRESETS: Record<NotificationCategoryEnum, NotificationCategoryPreset> = {
  [NotificationCategoryEnum.INFO]: { label: 'INFORMAÇÃO', icon: 'info-lined', accent: blue600 },
  [NotificationCategoryEnum.WARNING]: { label: 'ATENÇÃO', icon: 'warning-lined', accent: amber600 },
};
