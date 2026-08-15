import { Locator, Page } from '@playwright/test';

/**
 * Page object for the `/configuration` route ("Manage Congregation Cities").
 *
 * Exposes locators for the city list, inline editing inputs, buttons (`+ Add City`,
 * `Save Changes`, `Edit`, `Delete`, `Cancel`), and the no-congregation banner.
 */
export class ConfigurationPage {
  readonly heading: Locator;
  readonly congregationNameSubtitle: Locator;
  readonly citiesListContainer: Locator;
  readonly cityRows: Locator;
  readonly addCityButton: Locator;
  readonly saveButton: Locator;

  readonly cancelButton: Locator;

  readonly noCongregationBanner: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Manage Congregation Cities' });
    this.congregationNameSubtitle = page.getByTestId('config-congregation-subtitle');
    this.citiesListContainer = page.getByTestId('config-cities-list');
    this.cityRows = page.getByTestId('config-city-row');
    this.addCityButton = page.getByTestId('config-add-city');
    this.saveButton = page.getByTestId('config-save');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.noCongregationBanner = page.getByTestId('config-no-congregation-banner');
  }

  /** Navigate to the configuration page. */
  async goto(): Promise<void> {
    await this.page.goto('/configuration');
  }

  /** Locator for a city row matching `name`. */
  rowByName(name: string): Locator {
    return this.cityRows.filter({ hasText: name });
  }

  /** The input field inside an inline-editing city row. */
  cityInput(row?: Locator): Locator {
    return (row ?? this.page).getByTestId('config-city-input');
  }

  /** Fill a city input field. */
  async fillCityInput(inputLocator: Locator, value: string): Promise<void> {
    await inputLocator.fill(value);
  }

  /** The `Edit` button on a row. */
  editButton(row: Locator): Locator {
    return row.getByTestId('config-edit-city');
  }

  /** Edit a city by name. */
  async editCity(name: string): Promise<void> {
    await this.editButton(this.rowByName(name)).click();
  }

  /** The `Delete` button on a row. */
  deleteButton(row: Locator): Locator {
    return row.getByTestId('config-delete-city');
  }

  /** Delete a city by name and accept the confirmation dialog. */
  async deleteCity(name: string): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.deleteButton(this.rowByName(name)).click();
  }

  /** Click the Save button. */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /** Click the Add City button. */
  async addCity(): Promise<void> {
    await this.addCityButton.click();
  }
}
