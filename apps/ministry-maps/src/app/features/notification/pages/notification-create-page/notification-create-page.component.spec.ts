import { Dialog } from '@angular/cdk/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  LabelComponent,
  MultiSelectChipsComponent,
  SelectComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';
import { MockBuilder, MockedComponentFixture, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { of, Subject, throwError } from 'rxjs';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { RoleEnum } from '../../../../../models/enums/role';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationDialogComponent } from '../../components/notification-dialog/notification-dialog.component';
import { NotificationCreatePageComponent } from './notification-create-page.component';

type Fixture = MockedComponentFixture<NotificationCreatePageComponent>;

describe('NotificationCreatePageComponent', () => {
  beforeEach(() =>
    MockBuilder(NotificationCreatePageComponent)
      .keep(ReactiveFormsModule)
      .keep(FormFieldComponent)
      .keep(LabelComponent)
      .keep(InputComponent)
      .keep(SelectComponent)
      .keep(ButtonComponent)
      .keep(MultiSelectChipsComponent)
      .mock(NotificationBO)
      .mock(Dialog)
      .mock(Router)
      .mock(ToasterService),
  );
  MockInstance.scope();

  const element = <T extends HTMLElement>(fixture: Fixture, testId: string) =>
    ngMocks.find(fixture, `[data-testid="${testId}"]`).nativeElement as T;

  const fill = (
    fixture: Fixture,
    values: { category?: string; title?: string; content?: string; actionLabel?: string },
  ) => {
    const field = (testId: string) => ngMocks.find(fixture, `[data-testid="${testId}"]`);
    if (values.category !== undefined) ngMocks.change(field('notification-category-select'), values.category);
    if (values.title !== undefined) ngMocks.change(field('notification-title-input'), values.title);
    if (values.content !== undefined) ngMocks.change(field('notification-content-input'), values.content);
    if (values.actionLabel !== undefined) ngMocks.change(field('notification-action-label-input'), values.actionLabel);
    fixture.detectChanges();
  };

  const roleChip = (fixture: Fixture, role: RoleEnum) =>
    element<HTMLInputElement>(fixture, `multi-select-chips-option-${role}`);

  const selectRoles = (fixture: Fixture, roles: RoleEnum[]) => {
    roles.forEach((role) => roleChip(fixture, role).click());
    fixture.detectChanges();
  };

  it('starts as an informational notification with the default Entendi button label', () => {
    const fixture = MockRender(NotificationCreatePageComponent);

    expect(element<HTMLSelectElement>(fixture, 'notification-category-select').value).toBe(
      NotificationCategoryEnum.INFO,
    );
    expect(element<HTMLInputElement>(fixture, 'notification-action-label-input').value).toBe('Entendi');
  });

  it('keeps Publicar and Pré-visualizar disabled until the title and the content are filled', () => {
    const fixture = MockRender(NotificationCreatePageComponent);

    expect(element<HTMLButtonElement>(fixture, 'notification-publish-button').disabled).toBe(true);
    expect(element<HTMLButtonElement>(fixture, 'notification-preview-button').disabled).toBe(true);

    fill(fixture, { title: 'Manutenção', content: '## Sábado' });

    expect(element<HTMLButtonElement>(fixture, 'notification-publish-button').disabled).toBe(false);
    expect(element<HTMLButtonElement>(fixture, 'notification-preview-button').disabled).toBe(false);
  });

  it.each(['', '   '])('refuses a blank title (%j)', (title) => {
    const fixture = MockRender(NotificationCreatePageComponent);

    fill(fixture, { title, content: 'Conteúdo' });

    expect(element<HTMLButtonElement>(fixture, 'notification-publish-button').disabled).toBe(true);
  });

  it('publishes the draft with the selected target roles and returns to the notifications list', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.publish).mockReturnValue(of(undefined));
    });
    const fixture = MockRender(NotificationCreatePageComponent);
    fill(fixture, {
      category: NotificationCategoryEnum.WARNING,
      title: 'Manutenção',
      content: '## Sábado',
      actionLabel: 'Aceitar e continuar',
    });
    selectRoles(fixture, [RoleEnum.ADMIN, RoleEnum.ELDER]);

    ngMocks.trigger(ngMocks.find(fixture, 'form'), 'submit');

    expect(ngMocks.get(NotificationBO).publish).toHaveBeenCalledWith({
      category: NotificationCategoryEnum.WARNING,
      title: 'Manutenção',
      content: '## Sábado',
      actionLabel: 'Aceitar e continuar',
      targetRoles: [RoleEnum.ADMIN, RoleEnum.ELDER],
    });
    expect(ngMocks.get(Router).navigate).toHaveBeenCalledWith(['/', 'notifications']);
  });

  it('publishes without target roles when none are selected', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.publish).mockReturnValue(of(undefined));
    });
    const fixture = MockRender(NotificationCreatePageComponent);
    fill(fixture, { title: 'Manutenção', content: '## Sábado' });

    ngMocks.trigger(ngMocks.find(fixture, 'form'), 'submit');

    expect(ngMocks.get(NotificationBO).publish).toHaveBeenCalledWith({
      category: NotificationCategoryEnum.INFO,
      title: 'Manutenção',
      content: '## Sábado',
      actionLabel: 'Entendi',
      targetRoles: [],
    });
  });

  it('shows the all-users hint until roles are selected, then checks the chip of each selected role', () => {
    const fixture = MockRender(NotificationCreatePageComponent);

    expect(element(fixture, 'notification-roles-hint').textContent?.trim()).toBe(
      'Nenhum papel selecionado — todos os usuários verão esta notificação.',
    );
    expect(roleChip(fixture, RoleEnum.ELDER).checked).toBe(false);

    selectRoles(fixture, [RoleEnum.ELDER]);

    expect(ngMocks.findAll(fixture, '[data-testid="notification-roles-hint"]')).toHaveLength(0);
    expect(roleChip(fixture, RoleEnum.ELDER).checked).toBe(true);
    expect(roleChip(fixture, RoleEnum.ELDER).labels?.[0].textContent?.trim()).toBe('Ancião');
  });

  it('keeps the draft and warns when publishing fails', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.publish).mockReturnValue(throwError(() => new Error('offline')));
    });
    const fixture = MockRender(NotificationCreatePageComponent);
    fill(fixture, { title: 'Manutenção', content: '## Sábado' });

    ngMocks.trigger(ngMocks.find(fixture, 'form'), 'submit');

    expect(ngMocks.get(ToasterService).error).toHaveBeenCalledTimes(1);
    expect(ngMocks.get(Router).navigate).not.toHaveBeenCalled();
    expect(element<HTMLInputElement>(fixture, 'notification-title-input').value).toBe('Manutenção');
  });

  it('shows the in-progress draft in the notification viewer on Pré-visualizar', () => {
    const fixture = MockRender(NotificationCreatePageComponent);
    fill(fixture, { category: NotificationCategoryEnum.WARNING, title: 'Termos', content: 'Leia **tudo**.' });

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-preview-button"]'));

    expect(ngMocks.get(Dialog).open).toHaveBeenCalledWith(NotificationDialogComponent, {
      data: { category: NotificationCategoryEnum.WARNING, title: 'Termos', content: 'Leia **tudo**.' },
    });
  });

  it('keeps the publish button disabled while the draft is being saved', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.publish).mockReturnValue(new Subject<void>());
    });
    const fixture = MockRender(NotificationCreatePageComponent);
    fill(fixture, { title: 'Manutenção', content: '## Sábado' });

    ngMocks.trigger(ngMocks.find(fixture, 'form'), 'submit');
    fixture.detectChanges();

    expect(element<HTMLButtonElement>(fixture, 'notification-publish-button').disabled).toBe(true);
  });
});
