import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;
  readonly cardTerritories: Locator;
  readonly cardCongregation: Locator;
  readonly linkDesignarTerritorios: Locator;
  readonly linkTerritorios: Locator;
  readonly linkEstatisticas: Locator;
  readonly linkHistoricoDesignacoes: Locator;
  readonly linkPessoas: Locator;
  readonly linkCongregacao: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('home-heading');
    this.cardTerritories = page.getByTestId('home-card-territories');
    this.cardCongregation = page.getByTestId('home-card-congregation');
    this.linkDesignarTerritorios = page.getByRole('link', { name: 'Designar Territórios' }).first();
    this.linkTerritorios = page.getByRole('link', { name: 'Territórios', exact: true });
    this.linkEstatisticas = page.getByRole('link', { name: 'Estatísticas', exact: true });
    this.linkHistoricoDesignacoes = page.getByRole('link', { name: 'Histórico de Designações' });
    this.linkPessoas = page.getByRole('link', { name: 'Pessoas', exact: true });
    this.linkCongregacao = page.getByRole('link', { name: 'Congregação', exact: true });
  }

  async goto() {
    await this.page.goto('/home');
  }
}
