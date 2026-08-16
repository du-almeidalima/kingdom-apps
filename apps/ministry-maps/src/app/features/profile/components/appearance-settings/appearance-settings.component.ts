import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RadioGroupComponent,
  RadioOption,
  ThemePreference,
  ThemeService,
} from '@kingdom-apps/common-ui';
import { SectionComponent } from '../../../../shared/components/section/section.component';

@Component({
  selector: 'kingdom-apps-appearance-settings',
  standalone: true,
  imports: [SectionComponent, RadioGroupComponent, FormsModule],
  templateUrl: './appearance-settings.component.html',
  styleUrls: ['./appearance-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsComponent {
  private readonly themeService = inject(ThemeService);

  readonly currentPreference = this.themeService.preference;

  readonly options: RadioOption<ThemePreference>[] = [
    {
      value: 'system',
      label: 'Padrão do sistema',
      description: 'Seguir o dispositivo',
      testId: 'theme-option-system',
    },
    {
      value: 'light',
      label: 'Claro',
      description: 'Usar tema claro',
      testId: 'theme-option-light',
    },
    {
      value: 'dark',
      label: 'Escuro',
      description: 'Usar tema escuro',
      testId: 'theme-option-dark',
    },
  ];

  onSelectTheme(preference: ThemePreference) {
    this.themeService.setPreference(preference);
  }
}
