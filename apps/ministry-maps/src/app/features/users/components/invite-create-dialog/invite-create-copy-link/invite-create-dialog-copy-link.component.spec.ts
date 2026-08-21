import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { InviteCreateDialogCopyLinkComponent } from './invite-create-dialog-copy-link.component';
import { spyWindowOpen } from '../../../../../../test/mocks';
import { isMobileDevice } from '../../../../../shared/utils/user-agent';

jest.mock('../../../../../shared/utils/user-agent', () => ({
  isMobileDevice: jest.fn(() => false),
}));

const INVITE_LINK = 'https://ministry-maps.app/sign-in/INVITE-1';

describe('InviteCreateDialogCopyLinkComponent', () => {
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    windowOpenSpy = spyWindowOpen();
    jest.mocked(isMobileDevice).mockReturnValue(false);
    return MockBuilder(InviteCreateDialogCopyLinkComponent);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  const render = () =>
    MockRender(InviteCreateDialogCopyLinkComponent, { title: 'Criar Link de Convite', inviteLink: INVITE_LINK });

  it('renders the invite link to be copied', () => {
    const fixture = render();

    const copyBlock = ngMocks.find(fixture, 'lib-copy-text-block');
    expect(ngMocks.input(copyBlock, 'text')).toBe(INVITE_LINK);
  });

  it('opens a WhatsApp share link with the encoded invitation text on desktop', () => {
    render();

    ngMocks.click(ngMocks.find('[data-testid="invite-send-button"]'));

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const [whatsappUrl] = windowOpenSpy.mock.calls[0];
    expect(whatsappUrl).toMatch(/^whatsapp:\/\/send\?text=/);
    // Real newlines (encoded) instead of a literal %0a%0a inside the text
    expect(whatsappUrl).toContain('%0A%0A');
    expect(decodeURIComponent(whatsappUrl.replace('whatsapp://send?text=', ''))).toBe(
      `Por favor, acesse o link abaixo e conecte com sua conta Google para acessar o MM.\n\n${INVITE_LINK}`
    );
  });

  it('does not open a new window on mobile devices (navigates instead)', () => {
    jest.mocked(isMobileDevice).mockReturnValue(true);
    render();

    ngMocks.click(ngMocks.find('[data-testid="invite-send-button"]'));

    expect(windowOpenSpy).not.toHaveBeenCalled();
  });
});
