import { Locator, Page } from '@playwright/test';

/**
 * Page object for the `/congregation` route ("Congregação").
 */
export class CongregationPage {
  readonly heading: Locator;
  readonly congregationName: Locator;
  readonly editNameButton: Locator;
  readonly congregationNameInput: Locator;
  readonly saveNameButton: Locator;
  readonly cancelNameButton: Locator;
  readonly newCityInput: Locator;
  readonly addCityButton: Locator;
  readonly addCongregationButton: Locator;
  readonly citiesListContainer: Locator;
  readonly cityRows: Locator;
  readonly emptyCitiesState: Locator;
  readonly noCongregationBanner: Locator;

  // Remove City Dialog
  readonly removeCityDialog: Locator;
  readonly removeCityTransferOption: Locator;
  readonly removeCityDeleteOption: Locator;
  readonly removeCityTargetSelect: Locator;
  readonly summary: Locator;
  readonly removeCityConfirmButton: Locator;
  readonly removeCityCancelButton: Locator;

  // Add Congregation Dialog
  readonly addCongregationDialog: Locator;
  readonly addCongregationNameInput: Locator;
  readonly addCongregationLocationInput: Locator;
  readonly addCongregationCityInput: Locator;
  readonly addCongregationAddCityButton: Locator;
  readonly addCongregationChipsList: Locator;
  readonly addCongregationExpiryDaysInput: Locator;
  readonly addCongregationBlockExpiredCheckbox: Locator;
  readonly addCongregationSubmitButton: Locator;
  readonly addCongregationCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('config-heading');
    this.congregationName = page.getByTestId('config-congregation-name');
    this.editNameButton = page.getByTestId('config-edit-name');
    this.congregationNameInput = page.getByTestId('config-congregation-name-input');
    this.saveNameButton = page.getByTestId('config-save-name');
    this.cancelNameButton = page.getByTestId('config-cancel-name');
    this.newCityInput = page.getByTestId('config-new-city-input');
    this.addCityButton = page.getByTestId('config-add-city');
    this.addCongregationButton = page.getByTestId('config-add-congregation');
    this.citiesListContainer = page.getByTestId('config-cities-list');
    this.cityRows = page.getByTestId('config-city-row');
    this.emptyCitiesState = page.getByTestId('config-empty-cities');
    this.noCongregationBanner = page.getByTestId('config-no-congregation-banner');

    this.removeCityDialog = page.getByTestId('remove-city-dialog');
    this.removeCityTransferOption = page.getByTestId('remove-city-option-transfer');
    this.removeCityDeleteOption = page.getByTestId('remove-city-option-delete');
    this.removeCityTargetSelect = page.getByTestId('remove-city-target-select');
    this.summary = page.getByTestId('remove-city-summary');
    this.removeCityConfirmButton = page.getByTestId('remove-city-confirm');
    this.removeCityCancelButton = page.getByTestId('remove-city-cancel');

    this.addCongregationDialog = page.getByTestId('add-congregation-dialog');
    this.addCongregationNameInput = page.getByTestId('add-congregation-name-input');
    this.addCongregationLocationInput = page.getByTestId('add-congregation-location-input');
    this.addCongregationCityInput = page.getByTestId('add-congregation-city-input');
    this.addCongregationAddCityButton = page.getByTestId('add-congregation-add-city-btn');
    this.addCongregationChipsList = page.getByTestId('add-congregation-cities-chips');
    this.addCongregationExpiryDaysInput = page.getByTestId('add-congregation-expiry-days-input');
    this.addCongregationBlockExpiredCheckbox = page.getByTestId('add-congregation-block-expired-checkbox');
    this.addCongregationSubmitButton = page.getByTestId('add-congregation-submit');
    this.addCongregationCancelButton = page.getByTestId('add-congregation-cancel');
  }

  async goto(): Promise<void> {
    await this.page.goto('/congregation');
  }

  rowByName(name: string): Locator {
    return this.cityRows.filter({ hasText: name });
  }

  dragHandle(name: string): Locator {
    return this.rowByName(name).getByTestId('config-city-drag-handle');
  }

  cityInput(row?: Locator): Locator {
    return (row ?? this.page).getByTestId('config-city-input');
  }

  saveCityButton(row?: Locator): Locator {
    return (row ?? this.page).getByTestId('config-save-city');
  }

  cancelCityButton(row?: Locator): Locator {
    return (row ?? this.page).getByTestId('config-cancel-city');
  }

  editButton(row: Locator): Locator {
    return row.getByTestId('config-edit-city');
  }

  async editCity(name: string): Promise<void> {
    await this.editButton(this.rowByName(name)).click();
  }

  deleteButton(row: Locator): Locator {
    return row.getByTestId('config-delete-city');
  }

  async openRemoveCityDialog(name: string): Promise<void> {
    await this.deleteButton(this.rowByName(name)).click();
  }

  async addCity(name: string): Promise<void> {
    await this.newCityInput.fill(name);
    await this.addCityButton.click();
  }
}
