import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { InviteCreateDialogComponent } from './invite-create-dialog.component';
import { InviteBO } from '../../bo/invite/invite-bo.service';
import { RoleEnum } from '../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../../../core/features/auth/models/enums/auth-routes';

describe('InviteCreateDialogComponent', () => {
  let component: InviteCreateDialogComponent;

  const render = (createInviteLink: jest.Mock) => {
    const fixture = MockRender(InviteCreateDialogComponent, undefined, {
      providers: [{ provide: InviteBO, useValue: { createInviteLink } }],
    });
    component = fixture.point.componentInstance as InviteCreateDialogComponent;
    return fixture;
  };

  beforeEach(() => MockBuilder(InviteCreateDialogComponent).keep(FormBuilder));

  it('shows the creation form first', () => {
    const fixture = render(jest.fn());

    expect(ngMocks.find(fixture, 'kingdom-apps-invite-create-dialog-form')).toBeTruthy();
    expect(component.createdLink()).toBe('');
  });

  it('submits the raw form values to the InviteBO', () => {
    const createInviteLink = jest.fn().mockReturnValue(of({ id: 'INVITE-1' }));
    render(createInviteLink);

    component.form.controls.role.setValue(RoleEnum.ELDER);
    component.form.controls.email.setValue('invited@email.com');
    component.handleFormSubmit();

    expect(createInviteLink).toHaveBeenCalledWith({ role: RoleEnum.ELDER, email: 'invited@email.com' });
  });

  it('switches to the copy-link view with the composed invite URL on success', () => {
    const createInviteLink = jest.fn().mockReturnValue(of({ id: 'INVITE-1' }));
    const fixture = render(createInviteLink);

    component.handleFormSubmit();
    fixture.detectChanges();

    expect(component.createdLink().endsWith(`${AuthRoutesEnum.SIGN_IN}/INVITE-1`)).toBe(true);
    expect(ngMocks.find(fixture, 'kingdom-apps-invite-create-dialog-copy-link')).toBeTruthy();
    expect(ngMocks.find(fixture, 'kingdom-apps-invite-create-dialog-form', undefined)).toBeUndefined();
  });

  it('tracks the submitting state around the BO call', () => {
    const inviteLink$ = new Subject<{ id: string }>();
    const createInviteLink = jest.fn().mockReturnValue(inviteLink$.asObservable());
    render(createInviteLink);

    component.handleFormSubmit();
    expect(component.isSubmitting()).toBe(true);

    inviteLink$.next({ id: 'INVITE-2' });
    inviteLink$.complete();

    expect(component.isSubmitting()).toBe(false);
  });

  it('resets the submitting state even when the BO completes without a link (guard failure)', () => {
    const createInviteLink = jest.fn().mockReturnValue(of());
    const fixture = render(createInviteLink);

    component.handleFormSubmit();
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    // stays on the form view — no link was created
    expect(ngMocks.find(fixture, 'kingdom-apps-invite-create-dialog-form')).toBeTruthy();
  });
});
