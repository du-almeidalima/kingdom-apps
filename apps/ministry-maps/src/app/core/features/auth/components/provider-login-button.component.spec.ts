import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { ProviderLoginButtonComponent } from './provider-login-button.component';
import { FIREBASE_PROVIDERS } from '../../../../repositories/firebase/firebase-auth-datasource.service';

describe('ProviderLoginButtonComponent', () => {
  beforeEach(() => MockBuilder(ProviderLoginButtonComponent));

  it.each([
    [
      FIREBASE_PROVIDERS.GOOGLE,
      'Google',
      'https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA',
    ],
    [
      FIREBASE_PROVIDERS.MICROSOFT,
      'Microsoft',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Microsoft_icon.svg/240px-Microsoft_icon.svg.png',
    ],
  ])('renders the %s logo and pt-BR text (regression: branding must follow the provider input)', (provider, altText, imgUrl) => {
    const fixture = MockRender(ProviderLoginButtonComponent, { provider });
    const component = fixture.point.componentInstance as ProviderLoginButtonComponent;

    const image = ngMocks.find<HTMLImageElement>(fixture, 'img');
    expect(image.nativeElement.alt).toBe(altText);
    expect(component.imgUrl).toBe(imgUrl);
    expect(ngMocks.formatText(fixture)).toContain(`Entrar com uma conta do ${altText}`);
  });

  it('emits the bound provider on click', () => {
    const fixture = MockRender(ProviderLoginButtonComponent, { provider: FIREBASE_PROVIDERS.MICROSOFT });
    let emitted: FIREBASE_PROVIDERS | undefined;
    (fixture.point.componentInstance as ProviderLoginButtonComponent).providerClick.subscribe(
      provider => (emitted = provider)
    );

    ngMocks.click(ngMocks.find(fixture, 'button'));

    expect(emitted).toBe(FIREBASE_PROVIDERS.MICROSOFT);
  });

  it('disables the button and shows the spinner while loading', () => {
    const notLoading = MockRender(ProviderLoginButtonComponent, { provider: FIREBASE_PROVIDERS.GOOGLE, loading: false });
    expect(ngMocks.find(notLoading, 'button').nativeElement.disabled).toBe(false);
    expect(ngMocks.find(notLoading, 'lib-spinner', undefined)).toBeUndefined();

    const loading = MockRender(ProviderLoginButtonComponent, { provider: FIREBASE_PROVIDERS.GOOGLE, loading: true });
    expect(ngMocks.find(loading, 'button').nativeElement.disabled).toBe(true);
    expect(ngMocks.find(loading, 'lib-spinner')).toBeTruthy();
  });
});
