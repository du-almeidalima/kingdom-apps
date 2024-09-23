import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kingdom-apps-no-account-page',
  styleUrls: ['./no-account-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <h2 class="t-headline1">Olá!</h2>
      <div class="img-container">
        <img class="image" alt="MM Image" ngSrc="assets/images/map-image.png" priority fill="contain" />
      </div>
      <p class="t-body1 mt-10">
        Olá! Agradecemos por usar o <span class="t-primary font-bold">Ministry Maps</span> (<span class="t-primary font-bold">MM</span>).
      </p>
      <p class="t-body1 mt-5">
        Não conseguimos localizar sua conta, mas não se preocupe: <b>você não precisa de uma conta para usar o aplicativo!</b>
      </p>
      <p class="t-body1 mt-5">
        Se precisar de acesso à área restrita, é só pedir ao seu Superintendente de Grupo (SG) para enviar um link de
        cadastro. Estamos aqui para ajudar!
      </p>
    </div>
  `,
})
export class NoAccountPageComponent {}
