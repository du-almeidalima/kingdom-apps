import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, NonNullableFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';

import { UsersEditDialogComponent } from './users-edit-dialog.component';
import { UserRepository } from '../../../../repositories/user.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';

describe('UsersEditDialogComponent', () => {
  const dialogRefMock = { close: jest.fn() };

  MockInstance.scope();

  const render = (editedRole: RoleEnum, viewerRole: RoleEnum) => {
    const update = jest.fn().mockReturnValue(of(userMockBuilder({})));
    const userStateMock = new UserStateService();
    userStateMock.setUser(userMockBuilder({ role: viewerRole }));

    const fixture = MockRender(UsersEditDialogComponent, undefined, {
      providers: [
        { provide: DialogRef, useValue: dialogRefMock },
        { provide: UserRepository, useValue: { update } },
        { provide: UserStateService, useValue: userStateMock },
        { provide: NonNullableFormBuilder, useFactory: () => new FormBuilder().nonNullable },
        {
          provide: DIALOG_DATA,
          useValue: { user: userMockBuilder({ id: 'USER-EDITED', role: editedRole, name: 'Edited User' }) },
        },
      ],
    });

    return { fixture, update };
  };

  beforeEach(() => {
    dialogRefMock.close.mockReset();
    return MockBuilder(UsersEditDialogComponent);
  });

  it('seeds the form with the edited user role and name', () => {
    const { fixture } = render(RoleEnum.PUBLISHER, RoleEnum.ADMIN);

    const component = fixture.point.componentInstance as UsersEditDialogComponent;
    expect(component.form.controls.role.value).toBe(RoleEnum.PUBLISHER);
    expect(component.form.controls.name.value).toBe('Edited User');
  });

  it('renders the SUPERINTENDENT role option for APP_ADMIN viewers', () => {
    const { fixture: asAdmin } = render(RoleEnum.PUBLISHER, RoleEnum.APP_ADMIN);
    const adminTitles = ngMocks
      .findAll(asAdmin, '[data-testid="user-edit-role-title"]')
      .map((el) => el.nativeElement.textContent.trim());
    expect(adminTitles).toContain('Superintendente');
  });

  it('hides the SUPERINTENDENT role option from non-admin viewers', () => {
    const { fixture: asElder } = render(RoleEnum.PUBLISHER, RoleEnum.ELDER);
    const elderTitles = ngMocks
      .findAll(asElder, '[data-testid="user-edit-role-title"]')
      .map((el) => el.nativeElement.textContent.trim());
    expect(elderTitles).not.toContain('Superintendente');
  });

  describe('form disable rules', () => {
    it.each([
      [RoleEnum.SUPERINTENDENT, true],
      [RoleEnum.ADMIN, true],
      [RoleEnum.APP_ADMIN, true],
      // Regression: the old always-truthy check disabled the form for ANY user when the viewer was not APP_ADMIN.
      [RoleEnum.PUBLISHER, false],
      [RoleEnum.ORGANIZER, false],
      [RoleEnum.ELDER, false],
    ])('%s edited user + non-admin viewer → form disabled: %s', (editedRole, disabled) => {
      const { fixture } = render(editedRole, RoleEnum.ELDER);

      expect((fixture.point.componentInstance as UsersEditDialogComponent).form.disabled).toBe(disabled);
    });

    it('keeps the form enabled for admin-level users when the viewer is APP_ADMIN', () => {
      const { fixture } = render(RoleEnum.SUPERINTENDENT, RoleEnum.APP_ADMIN);

      expect((fixture.point.componentInstance as UsersEditDialogComponent).form.disabled).toBe(false);
    });
  });

  describe('handleFormSubmit', () => {
    it('persists the changed role and name, then closes the dialog', () => {
      const { fixture, update } = render(RoleEnum.PUBLISHER, RoleEnum.ADMIN);
      const component = fixture.point.componentInstance as UsersEditDialogComponent;

      component.form.controls.role.setValue(RoleEnum.ELDER);
      component.form.controls.name.setValue('Renamed User');
      component.handleFormSubmit();

      expect(update).toHaveBeenCalledTimes(1);
      const savedUser = update.mock.calls[0][0];
      expect(savedUser.role).toBe(RoleEnum.ELDER);
      expect(savedUser.name).toBe('Renamed User');
      expect(savedUser.id).toBe('USER-EDITED');
      expect(dialogRefMock.close).toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('does not mutate the original dialog data user', () => {
      const { fixture } = render(RoleEnum.PUBLISHER, RoleEnum.ADMIN);
      const component = fixture.point.componentInstance as UsersEditDialogComponent;
      const originalSnapshot = structuredClone(component.data.user);

      component.form.controls.name.setValue('Another Name');
      component.handleFormSubmit();

      expect(component.data.user).toEqual(originalSnapshot);
    });
  });
});
