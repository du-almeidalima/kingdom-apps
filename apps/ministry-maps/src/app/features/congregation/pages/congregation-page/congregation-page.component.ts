import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from '@angular/cdk/dialog';
import { finalize } from 'rxjs';
import { AuthorizeDirective, ButtonComponent, ToasterService } from '@kingdom-apps/common-ui';

import { CongregationBO, RemoveCityResolution } from '../../bo/congregation/congregation.bo';
import { UserStateService } from '../../../../state/user.state.service';
import { RoleEnum } from '../../../../../models/enums/role';
import { CongregationNameFormComponent } from '../../components/congregation-name-form/congregation-name-form.component';
import {
  CongregationCitiesComponent,
  RenameCityEvent,
} from '../../components/congregation-cities/congregation-cities.component';
import {
  CongregationRemoveCityDialogComponent,
  CongregationRemoveCityDialogData,
} from '../../components/congregation-remove-city-dialog/congregation-remove-city-dialog.component';
import { CongregationAddDialogComponent } from '../../components/congregation-add-dialog/congregation-add-dialog.component';

@Component({
  selector: 'kingdom-apps-congregation-page',
  templateUrl: './congregation-page.component.html',
  styleUrl: './congregation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthorizeDirective, ButtonComponent, CongregationNameFormComponent, CongregationCitiesComponent],
})
export class CongregationPageComponent {
  private readonly congregationBO = inject(CongregationBO);
  private readonly userState = inject(UserStateService);
  private readonly toaster = inject(ToasterService);
  private readonly dialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly RoleEnum = RoleEnum;

  readonly congregation = computed(() => {
    const cong = this.userState.user()?.congregation;
    return cong?.id ? cong : null;
  });

  readonly cities = computed(() => this.congregation()?.cities ?? []);
  readonly isLoading = signal(false);

  handleSaveCongregationName(newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.congregationBO
      .updateCongregationName(trimmed)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Nome da congregação atualizado com sucesso!');
        },
        error: (err) => {
          this.toaster.error(`Erro ao atualizar nome da congregação: ${err?.message || 'Erro desconhecido'}`);
        },
      });
  }

  handleAddCity(cityName: string): void {
    if (this.isLoading()) {
      return;
    }

    const trimmed = cityName.trim();
    if (!trimmed) {
      this.toaster.error('O nome da cidade não pode estar vazio.');
      return;
    }

    const isDuplicate = this.cities().some((c) => c.trim().toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      this.toaster.error('O nome da cidade deve ser único.');
      return;
    }

    this.isLoading.set(true);
    this.congregationBO
      .addCity(trimmed)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Cidade adicionada com sucesso!');
        },
        error: (err) => {
          this.toaster.error(`Erro ao adicionar cidade: ${err?.message || 'Erro desconhecido'}`);
        },
      });
  }

  handleRenameCity({ oldName, newName }: RenameCityEvent): void {
    if (this.isLoading()) {
      return;
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      this.toaster.error('O nome da cidade não pode estar vazio.');
      return;
    }

    const oldIndex = this.cities().indexOf(oldName);
    const isDuplicate = this.cities().some(
      (c, idx) => idx !== oldIndex && c.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      this.toaster.error('O nome da cidade deve ser único.');
      return;
    }

    if (trimmed === oldName) {
      return;
    }

    this.isLoading.set(true);
    this.congregationBO
      .renameCity(oldName, trimmed)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Cidade atualizada com sucesso!');
        },
        error: (err) => {
          this.toaster.error(`Erro ao atualizar cidade: ${err?.message || 'Erro desconhecido'}`);
        },
      });
  }

  handleReorderCities(reordered: string[]): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.congregationBO
      .reorderCities(reordered)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Ordem das cidades atualizada com sucesso!');
        },
        error: (err) => {
          this.toaster.error(`Erro ao reordenar cidades: ${err?.message || 'Erro desconhecido'}`);
        },
      });
  }

  handleRemoveCity(cityName: string): void {
    const remainingCities = this.cities().filter((c) => c !== cityName);
    const ref = this.dialog.open<RemoveCityResolution, CongregationRemoveCityDialogData>(
      CongregationRemoveCityDialogComponent,
      {
        data: {
          cityName,
          remainingCities,
        },
      },
    );

    ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((resolution) => {
      if (!resolution) {
        return;
      }

      this.isLoading.set(true);
      this.congregationBO
        .removeCity(cityName, resolution)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isLoading.set(false)),
        )
        .subscribe({
          next: () => {
            this.toaster.success('Cidade removida com sucesso!');
          },
          error: (err) => {
            this.toaster.error(`Erro ao remover cidade: ${err?.message || 'Erro desconhecido'}`);
          },
        });
    });
  }

  handleOpenAddCongregationDialog(): void {
    this.dialog.open(CongregationAddDialogComponent);
  }
}
