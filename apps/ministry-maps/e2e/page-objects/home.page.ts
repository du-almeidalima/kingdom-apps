import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;
  readonly cardTerritories: Locator;
  readonly cardPeople: Locator;
  readonly linkDesignarTerritorios: Locator;
  readonly linkAdministrarTerritorios: Locator;
  readonly linkEstatisticasTerritorios: Locator;
  readonly linkAdministrarPessoas: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('home-heading');
    this.cardTerritories = page.getByTestId('home-card-territories');
    this.cardPeople = page.getByTestId('home-card-people');
    this.linkDesignarTerritorios = page.getByRole('link', { name: 'Designar Territórios' }).first();
    this.linkAdministrarTerritorios = page.getByRole('link', { name: 'Administrar Territórios' });
    this.linkEstatisticasTerritorios = page.getByRole('link', { name: 'Estatísticas Territórios' });
    this.linkAdministrarPessoas = page.getByRole('link', { name: 'Administrar Pessoas' });
  }

  async goto() {
    await this.page.goto('/home');
  }
}
