import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionComponent } from '../../../shared/components/section/section.component';
import { UserStateService } from '../../../state/user.state.service';
import { SelectComponent } from '@kingdom-apps/common-ui';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CongregationRepository } from '../../../repositories/congregation.repository';
import { Congregation } from '../../../../models/congregation';
import { ProfileBO } from '../bo/profile.bo';
import { finalize } from 'rxjs';

@Component({
  selector: 'kingdom-apps-change-congregation',
  styleUrl: './change-congregation.component.scss',
  standalone: true,
  imports: [CommonModule, SectionComponent, FormsModule, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kingdom-apps-section title="Administrador" [isLoading]="isLoading()">
      <p class="t-body2 mb-2.5">Selecione a congregação que deseja ver:</p>
      <select
        lib-select
        class="w-full"
        name="Cidade"
        [ngModel]="user()?.congregation?.id"
        (ngModelChange)="handleChangeCongregation($event)">
        <option [value]="congregation.id" *ngFor="let congregation of congregations()">{{ congregation.name }}</option>
      </select>
    </kingdom-apps-section>
  `,
})
export class ChangeCongregationComponent implements OnInit {
  userState = inject(UserStateService);
  congregationRepository = inject(CongregationRepository);
  profileBo = inject(ProfileBO);

  isLoading = signal(false);
  user = toSignal(this.userState.$user);
  congregations = signal<Pick<Congregation, 'name' | 'id'>[]>([
    {
      name: this.user()?.congregation?.name ?? '',
      id: this.user()?.congregation?.id ?? '',
    },
  ]);

  ngOnInit(): void {
    this.congregationRepository.getCongregations().subscribe(congregations => {
      this.congregations.set(congregations ?? []);
    });
  }

  handleChangeCongregation(congregationId: string) {
    if (!this.user()?.id) {
      return;
    }

    this.isLoading.set(true);
    this.profileBo
    // @ts-expect-error: TypeScript is struggling to infer types with Signals...
      .changeUserCongregation(this.user()?.id, congregationId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe();
  }
}
