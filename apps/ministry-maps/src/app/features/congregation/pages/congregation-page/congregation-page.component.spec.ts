import { of, Subject, throwError } from 'rxjs';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import {
  AuthUserStateService,
  AuthorizeDirective,
  ButtonComponent,
  FormFieldComponent,
  IconButtonComponent,
  IconComponent,
  InputComponent,
  LabelComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';

import { CongregationPageComponent } from './congregation-page.component';
import { CongregationNameFormComponent } from '../../components/congregation-name-form/congregation-name-form.component';
import { CongregationCitiesComponent } from '../../components/congregation-cities/congregation-cities.component';
import { CongregationBO, RemoveCityResolution } from '../../bo/congregation/congregation.bo';
import { UserStateService } from '../../../../state/user.state.service';
import { congregationMock, userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';
import { CongregationRemoveCityDialogComponent } from '../../components/congregation-remove-city-dialog/congregation-remove-city-dialog.component';
import { CongregationAddDialogComponent } from '../../components/congregation-add-dialog/congregation-add-dialog.component';

describe('CongregationPageComponent', () => {
  let congregationBOMock: {
    updateCongregationName: jest.Mock;
    addCity: jest.Mock;
    getTerritoryCountsByCity: jest.Mock;
    renameCity: jest.Mock;
    reorderCities: jest.Mock;
    removeCity: jest.Mock;
  };
  let dialogOpenSpy: jest.Mock;
  let userState: UserStateService;
  let authUserState: AuthUserStateService;
  const toasterMock = { success: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    userState = new UserStateService();
    userState.setUser(
      userMockBuilder({
        role: RoleEnum.ADMIN,
        congregation: { ...congregationMock, cities: ['City 1', 'City 2', 'City 3'] },
      }),
    );
    authUserState = new AuthUserStateService();
    authUserState.setUser({ name: 'Admin', roles: [RoleEnum.ADMIN] });

    congregationBOMock = {
      updateCongregationName: jest.fn().mockImplementation((newName: string) => {
        const current = userState.currentUser;
        if (current?.congregation) {
          userState.setUser({ ...current, congregation: { ...current.congregation, name: newName } });
        }
        return of(undefined);
      }),
      addCity: jest.fn().mockImplementation((city: string) => {
        const current = userState.currentUser;
        if (current?.congregation) {
          userState.setUser({
            ...current,
            congregation: { ...current.congregation, cities: [...current.congregation.cities, city] },
          });
        }
        return of(undefined);
      }),
      getTerritoryCountsByCity: jest.fn().mockReturnValue(of({ 'City 1': 2, 'City 2': 1 })),
      renameCity: jest.fn().mockImplementation((oldName: string, newName: string) => {
        const current = userState.currentUser;
        if (current?.congregation) {
          userState.setUser({
            ...current,
            congregation: {
              ...current.congregation,
              cities: current.congregation.cities.map((c) => (c === oldName ? newName : c)),
            },
          });
        }
        return of(undefined);
      }),
      reorderCities: jest.fn().mockImplementation((cities: string[]) => {
        const current = userState.currentUser;
        if (current?.congregation) {
          userState.setUser({ ...current, congregation: { ...current.congregation, cities: [...cities] } });
        }
        return of(undefined);
      }),
      removeCity: jest.fn().mockImplementation((cityName: string) => {
        const current = userState.currentUser;
        if (current?.congregation) {
          userState.setUser({
            ...current,
            congregation: {
              ...current.congregation,
              cities: current.congregation.cities.filter((c) => c !== cityName),
            },
          });
        }
        return of(undefined);
      }),
    };

    dialogOpenSpy = jest.fn();
    toasterMock.success.mockReset();
    toasterMock.error.mockReset();

    return MockBuilder(CongregationPageComponent)
      .keep(CongregationNameFormComponent)
      .keep(CongregationCitiesComponent)
      .keep(FormsModule)
      .keep(AuthorizeDirective)
      .keep(ButtonComponent)
      .keep(IconButtonComponent)
      .keep(IconComponent)
      .keep(InputComponent)
      .keep(FormFieldComponent)
      .keep(LabelComponent)
      .provide({ provide: CongregationBO, useValue: congregationBOMock })
      .provide({ provide: UserStateService, useValue: userState })
      .provide({ provide: AuthUserStateService, useValue: authUserState })
      .provide({ provide: ToasterService, useValue: toasterMock })
      .provide({ provide: Dialog, useValue: { open: dialogOpenSpy } });
  });

  it('renders congregation name, city list and territory counts in pt-BR', async () => {
    const fixture = MockRender(CongregationPageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = ngMocks.findAll(fixture, '[data-testid="config-city-row"]');
    expect(rows).toHaveLength(3);
    expect(ngMocks.find(fixture, '[data-testid="config-congregation-name"]').nativeElement.textContent).toContain(
      congregationMock.name,
    );
    expect(fixture.nativeElement.textContent).toContain('2 territórios');
    expect(fixture.nativeElement.textContent).toContain('1 território');
  });

  it('shows the pt-BR no-congregation banner when the user has no congregation', () => {
    userState.setUser(userMockBuilder({ congregation: undefined }));
    const fixture = MockRender(CongregationPageComponent);

    const banner = ngMocks.find(fixture, '[data-testid="config-no-congregation-banner"]');
    expect(banner.nativeElement.textContent).toContain('Nenhuma congregação encontrada');
  });

  it('orchestrates congregation name updates and shows an error toast on failure', () => {
    const fixture = MockRender(CongregationPageComponent);
    const comp = fixture.point.componentInstance;

    comp.handleSaveCongregationName('Congregação Nova Esperança');
    fixture.detectChanges();

    expect(congregationBOMock.updateCongregationName).toHaveBeenCalledWith('Congregação Nova Esperança');
    expect(toasterMock.success).toHaveBeenCalled();

    congregationBOMock.updateCongregationName.mockReturnValue(throwError(() => new Error('boom')));
    comp.handleSaveCongregationName('Outro Nome');
    expect(toasterMock.error).toHaveBeenCalled();
  });

  it('validates and orchestrates adding a city', () => {
    const fixture = MockRender(CongregationPageComponent);
    const comp = fixture.point.componentInstance;

    comp.handleAddCity('   ');
    expect(toasterMock.error).toHaveBeenCalledWith('O nome da cidade não pode estar vazio.');
    expect(congregationBOMock.addCity).not.toHaveBeenCalled();

    comp.handleAddCity('city 1');
    expect(toasterMock.error).toHaveBeenCalledWith('O nome da cidade deve ser único.');
    expect(congregationBOMock.addCity).not.toHaveBeenCalled();

    comp.handleAddCity('  City 4  ');
    fixture.detectChanges();
    expect(congregationBOMock.addCity).toHaveBeenCalledWith('City 4');
    expect(ngMocks.findAll(fixture, '[data-testid="config-city-row"]')).toHaveLength(4);
  });

  it('validates and orchestrates renaming and reordering cities', () => {
    const fixture = MockRender(CongregationPageComponent);
    const comp = fixture.point.componentInstance;

    comp.handleRenameCity({ oldName: 'City 1', newName: 'CITY 2' });
    expect(toasterMock.error).toHaveBeenCalledWith('O nome da cidade deve ser único.');
    expect(congregationBOMock.renameCity).not.toHaveBeenCalled();

    comp.handleRenameCity({ oldName: 'City 1', newName: 'City 1 Renomeada' });
    fixture.detectChanges();
    expect(congregationBOMock.renameCity).toHaveBeenCalledWith('City 1', 'City 1 Renomeada');

    comp.handleReorderCities(['City 2', 'City 3', 'City 1 Renomeada']);
    fixture.detectChanges();
    expect(congregationBOMock.reorderCities).toHaveBeenCalledWith(['City 2', 'City 3', 'City 1 Renomeada']);
  });

  it('opens CongregationRemoveCityDialogComponent with territory counts and calls removeCity when confirmed', async () => {
    const closed$ = new Subject<RemoveCityResolution | undefined>();
    dialogOpenSpy.mockReturnValue({ closed: closed$.asObservable() } as DialogRef<RemoveCityResolution>);

    const fixture = MockRender(CongregationPageComponent);
    await fixture.whenStable();
    fixture.point.componentInstance.handleRemoveCity('City 1');

    expect(dialogOpenSpy).toHaveBeenCalledWith(CongregationRemoveCityDialogComponent, {
      data: {
        cityName: 'City 1',
        remainingCities: ['City 2', 'City 3'],
        territoryCounts: { 'City 1': 2, 'City 2': 1 },
      },
    });

    closed$.next({ action: 'transfer', targetCity: 'City 2' });
    fixture.detectChanges();

    expect(congregationBOMock.removeCity).toHaveBeenCalledWith('City 1', {
      action: 'transfer',
      targetCity: 'City 2',
    });
    expect(toasterMock.success).toHaveBeenCalled();
  });

  it('hides Adicionar Congregação for ADMIN and shows it for APP_ADMIN', () => {
    const adminFixture = MockRender(CongregationPageComponent);
    expect(ngMocks.findAll(adminFixture, '[data-testid="config-add-congregation"]')).toHaveLength(0);

    authUserState.setUser({ name: 'App Admin', roles: [RoleEnum.APP_ADMIN] });
    userState.setUser(userMockBuilder({ role: RoleEnum.APP_ADMIN, congregation: congregationMock }));
    const appAdminFixture = MockRender(CongregationPageComponent);

    const addCongBtn = ngMocks.find(appAdminFixture, '[data-testid="config-add-congregation"]');
    expect(addCongBtn).toBeTruthy();

    dialogOpenSpy.mockReturnValue({ closed: of(undefined) });
    ngMocks.click(addCongBtn);
    expect(dialogOpenSpy).toHaveBeenCalledWith(CongregationAddDialogComponent);
  });
});
