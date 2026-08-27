import { Dialog } from '@angular/cdk/dialog';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { TerritoryCheckboxComponent } from './territory-checkbox.component';
import { territoryMockBuilder } from '../../../../../test/mocks';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';

jest.mock('../../../../shared/utils/open-google-maps', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const historyEntry = (partial: Partial<TerritoryVisitHistory> = {}): TerritoryVisitHistory => ({
  id: 'HISTORY-1',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 10),
  notes: 'a visit',
  ...partial,
});

describe('TerritoryCheckboxComponent', () => {
  let fixture: ReturnType<typeof MockRender<TerritoryCheckboxComponent>>;
  let component: TerritoryCheckboxComponent;

  const render = (territoryOverrides: Parameters<typeof territoryMockBuilder>[0] = {}) => {
    fixture = MockRender(TerritoryCheckboxComponent, { territory: territoryMockBuilder(territoryOverrides) });
    component = fixture.point.componentInstance as TerritoryCheckboxComponent;
    return fixture;
  };

  beforeEach(() => {
    jest.mocked(openGoogleMapsHandler).mockReset();
    return MockBuilder(TerritoryCheckboxComponent);
  });

  it('renders the territory address and note', () => {
    const fixture = render({ address: 'Main Street 1', note: 'blue house' });

    expect(ngMocks.formatText(fixture)).toContain('Main Street 1');
    expect(ngMocks.formatText(fixture)).toContain('blue house');
  });

  describe('alert badges', () => {
    it.each([
      [
        'revisit',
        { recentHistory: [historyEntry({ isRevisit: true })] },
        '.territory-alert-badge--revisit',
        'Revisita',
      ],
      [
        'moved',
        { recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED })] },
        '.territory-alert-badge--moved',
        'Mudou',
      ],
      [
        'asked to stop visiting',
        {
          recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: new Date() })],
        },
        '.territory-alert-badge--stop-visiting',
        'Não quer visitas',
      ],
      ['bible student', { isBibleStudent: true }, '.territory-alert-badge--bible-student', 'Estudante'],
    ])('renders the %s badge', (_desc, overrides, badgeClass, badgeText) => {
      const fixture = render(overrides as Parameters<typeof territoryMockBuilder>[0]);

      const badge = ngMocks.find(fixture, badgeClass);
      expect(ngMocks.formatText(badge)).toContain(badgeText);
    });

    it('renders no badges for a plain territory', () => {
      const fixture = render({ recentHistory: [] });

      expect(ngMocks.findAll(fixture, '.territory-alert-badge')).toHaveLength(0);
    });
  });

  describe('ControlValueAccessor contract', () => {
    it('writeValue selects the checkbox and updates the indicator', () => {
      render();

      expect(component.statusClass()).toContain('default');

      component.writeValue(true);
      fixture.detectChanges();

      expect(component.value()).toBe(true);
      expect(component.statusClass()).toContain('selected');
    });

    it('setDisabledState disables the control and switches the indicator', () => {
      render();

      component.setDisabledState(true);
      fixture.detectChanges();

      expect(component.statusClass()).toContain('disabled');
    });

    it('setValue propagates the value through onChange and onTouched', () => {
      render();
      const onChange = jest.fn();
      const onTouched = jest.fn();
      component.registerOnChange(onChange);
      component.registerOnTouched(onTouched);

      component.setValue(true);

      expect(component.value()).toBe(true);
      expect(onChange).toHaveBeenCalledWith(true);
      expect(onTouched).toHaveBeenCalled();
    });

    it('setValue is a no-op while disabled', () => {
      render();
      const onChange = jest.fn();
      component.registerOnChange(onChange);
      component.setDisabledState(true);

      component.setValue(true);

      expect(component.value()).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('toggling the underlying checkbox input propagates through the CVA callbacks', () => {
      render();
      const onChange = jest.fn();
      component.registerOnChange(onChange);

      ngMocks.change(ngMocks.find(fixture, 'input[type="checkbox"]'), true);

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('action buttons', () => {
    it('opens Google Maps for a territory with a maps link', () => {
      const withLink = render({ mapsLink: 'https://maps.app.goo.gl/xyz' });

      ngMocks.click(ngMocks.find(withLink, 'button'));

      expect(openGoogleMapsHandler).toHaveBeenCalledWith('https://maps.app.goo.gl/xyz', component.territory());
    });

    it('hides the maps button when there is no maps link', () => {
      const withoutLink = render({ mapsLink: undefined });

      // only the history button remains
      expect(ngMocks.findAll(withoutLink, 'button')).toHaveLength(1);
    });

    it('opens the history dialog with the recent history reversed', () => {
      render({ mapsLink: undefined, recentHistory: [historyEntry({ id: 'H1' }), historyEntry({ id: 'H2' })] });
      const dialog = ngMocks.get(Dialog) as jest.Mocked<Dialog>;

      ngMocks.click(ngMocks.find(fixture, 'button'));

      expect(dialog.open).toHaveBeenCalledWith(HistoryDialogComponent, {
        data: [expect.objectContaining({ id: 'H2' }), expect.objectContaining({ id: 'H1' })],
      });
    });
  });
});
