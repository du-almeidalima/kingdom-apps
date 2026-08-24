import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { InviteCreateDialogFormComponent } from './invite-create-dialog-form.component';
import { TCreateLinkForm } from '../invite-create-dialog.component';
import { RoleEnum } from '../../../../../../models/enums/role';

describe('InviteCreateDialogFormComponent', () => {
  let form: TCreateLinkForm;

  const render = (isSubmitting: boolean) =>
    MockRender(InviteCreateDialogFormComponent, {
      title: 'Criar Link de Convite',
      form,
      isSubmitting,
    });

  beforeEach(() => {
    form = new FormGroup({
      role: new FormControl(RoleEnum.PUBLISHER, { nonNullable: true }),
      email: new FormControl(''),
    }) as TCreateLinkForm;

    return MockBuilder(InviteCreateDialogFormComponent).keep(ReactiveFormsModule);
  });

  it('renders the email input bound to the form control', () => {
    const fixture = render(false);

    ngMocks.change(ngMocks.find(fixture, '[data-testid="invite-email-input"]'), 'invited@email.com');

    expect(form.controls.email.value).toBe('invited@email.com');
  });

  it('emits formSubmit when the form is submitted', () => {
    const fixture = render(false);
    let emitted = 0;
    (fixture.point.componentInstance as InviteCreateDialogFormComponent).formSubmit.subscribe(() => emitted++);

    ngMocks.trigger(ngMocks.find(fixture, 'form'), new Event('submit', { bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toBe(1);
  });

  it('renders the three role options', () => {
    const fixture = render(false);

    const titles = ngMocks.findAll(fixture, '.radio-option__title').map((el) => el.nativeElement.textContent.trim());

    expect(titles).toEqual(['Publicador', 'Organizador', 'Ancião']);
  });

  it('swaps the submit label for a spinner while submitting', () => {
    const idle = render(false);
    expect(ngMocks.formatText(idle)).toContain('Criar Link');
    expect(ngMocks.find(idle, 'lib-spinner', undefined)).toBeUndefined();

    const submitting = render(true);
    expect(ngMocks.find(submitting, 'lib-spinner')).toBeTruthy();
    expect(ngMocks.formatText(submitting)).not.toContain('Criar Link');
  });
});
