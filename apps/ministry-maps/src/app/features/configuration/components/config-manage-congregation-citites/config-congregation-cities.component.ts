import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToasterService } from '@kingdom-apps/common-ui';

import { Congregation } from '../../../../../models/congregation';
import { ConfigurationBO, UpdateCongregationCityDTO } from '../../../../shared/business-objects/configuration.bo';
import { UserStateService } from '../../../../state/user.state.service';

interface CityItem {
  originalName: string;
  currentName: string;
  isEditing: boolean;
  isNew: boolean;
}

@Component({
  selector: 'kingdom-apps-config-congregation-cities',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <div class="mb-8">
        <h2 class="text-3xl font-semibold text-gray-900 mb-2">Manage Congregation Cities</h2>
        <p class="text-gray-600" *ngIf="congregation">{{ congregation.name }}</p>
      </div>

      <!-- Cities List -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden" *ngIf="congregation">
        <div
          class="px-6 py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
          *ngFor="let city of cities; let i = index"
        >
          <div class="flex justify-between items-center gap-4" *ngIf="!city.isEditing">
            <span class="flex-1 text-gray-900 font-medium">{{ city.currentName }}</span>
            <div class="flex gap-2">
              <button
                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                (click)="editCity(city)"
                [disabled]="hasEditingCities"
              >
                Edit
              </button>
              <button
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                (click)="deleteCity(i)"
                [disabled]="hasEditingCities"
              >
                Delete
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center gap-4 -mx-6 -my-4 px-6 py-4 bg-gray-50" *ngIf="city.isEditing">
            <input
              type="text"
              [(ngModel)]="city.currentName"
              class="flex-1 px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-0 transition-colors"
              [class.border-blue-500]="!city.isNew"
              [class.focus:border-blue-600]="!city.isNew"
              [class.border-green-500]="city.isNew"
              [class.focus:border-green-600]="city.isNew"
              placeholder="Enter city name"
            />
            <div class="flex gap-2">
              <button
                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                (click)="cancelEdit(city, i)"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-12 text-center text-gray-500" *ngIf="cities.length === 0">
          <p>No cities configured yet. Add your first city below.</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4">
        <button
          class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          (click)="addCity()"
          [disabled]="hasEditingCities || isLoading"
        >
          + Add City
        </button>

        <button
          class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          (click)="saveChanges()"
          [disabled]="!hasChanges() || isLoading"
        >
          <span *ngIf="!isLoading">Save Changes</span>
          <span *ngIf="isLoading">Saving...</span>
        </button>
      </div>

      <!-- No Congregation State -->
      <div class="p-12 text-center bg-red-50 border border-red-200 rounded-lg text-red-800" *ngIf="!congregation">
        <p class="text-lg">No congregation found. Please ensure you are logged in.</p>
      </div>
    </div>
  `,
})
export class ConfigCongregationCitiesComponent implements OnInit {
  private configurationBO = inject(ConfigurationBO);
  private userState = inject(UserStateService);
  private toaster = inject(ToasterService);

  congregation: Congregation | null = null;
  cities: CityItem[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadCongregation();
  }

  private loadCongregation(): void {
    const user = this.userState.currentUser;
    this.congregation = user?.congregation || null;

    if (this.congregation) {
      this.cities = this.congregation.cities.map((city) => ({
        originalName: city,
        currentName: city,
        isEditing: false,
        isNew: false,
      }));
    }
  }

  addCity(): void {
    this.cities.push({
      originalName: '',
      currentName: '',
      isEditing: true,
      isNew: true,
    });
  }

  editCity(city: CityItem): void {
    city.isEditing = true;
  }

  cancelEdit(city: CityItem, index: number): void {
    if (city.isNew) {
      this.cities.splice(index, 1);
    } else {
      city.currentName = city.originalName;
      city.isEditing = false;
    }
  }

  deleteCity(index: number): void {
    if (confirm('Are you sure you want to delete this city?')) {
      this.cities.splice(index, 1);
    }
  }

  saveChanges(): void {
    // Validate that all cities have names
    const hasEmptyCities = this.cities.some((city) => !city.currentName.trim());
    if (hasEmptyCities) {
      this.toaster.error('All cities must have a name.');
      return;
    }

    // Check for duplicate city names
    const cityNames = this.cities.map((c) => c.currentName.trim().toLowerCase());
    const hasDuplicates = cityNames.some((name, index) => cityNames.indexOf(name) !== index);
    if (hasDuplicates) {
      this.toaster.error('City names must be unique.');
      return;
    }

    // Build the update DTOs
    const updates: UpdateCongregationCityDTO[] = this.cities.map((city) => ({
      oldCityName: city.isNew ? undefined : city.originalName,
      newCityName: city.currentName.trim(),
    }));

    this.isLoading = true;

    this.configurationBO.updateCongregationCities(updates).subscribe({
      next: () => {
        this.toaster.success('Cities updated successfully!');
        this.isLoading = false;

        // Update the local state
        this.cities = this.cities.map((city) => ({
          originalName: city.currentName,
          currentName: city.currentName,
          isEditing: false,
          isNew: false,
        }));
      },
      error: (error) => {
        this.toaster.error(`Error updating cities: ${error.message || 'Unknown error'}`);
        this.isLoading = false;
      },
    });
  }

  hasChanges(): boolean {
    return this.cities.some((city) => city.isNew || city.currentName !== city.originalName);
  }

  get hasEditingCities(): boolean {
    return this.cities.some((city) => city.isEditing);
  }
}
