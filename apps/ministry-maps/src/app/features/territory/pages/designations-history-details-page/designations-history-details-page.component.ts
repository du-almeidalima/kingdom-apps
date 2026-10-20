import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SpinnerComponent } from '@kingdom-apps/common-ui';
import { catchError, finalize, map, of } from 'rxjs';

import { Designation } from '../../../../../models/designation';
import { DesignationsHistoryBO } from '../../bo/designations-history/designations-history.bo';
import { DesignationProgressCardComponent } from '../../components/designation-progress-card/designation-progress-card.component';
import { DesignationsProgressSummaryComponent } from '../../components/designations-progress-summary/designations-progress-summary.component';
import { DesignationTerritoryRow, DesignationsHeaderDetail } from '../../models/designations-history.models';
import { shareDesignationLink } from '../../../../shared/utils/share-utils';

@Component({
  selector: 'kingdom-apps-designations-history-details-page',
  templateUrl: './designations-history-details-page.component.html',
  styleUrls: ['./designations-history-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, DesignationsProgressSummaryComponent, DesignationProgressCardComponent],
})
export class DesignationsHistoryDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bo = inject(DesignationsHistoryBO);
  private readonly destroyRef = inject(DestroyRef);
  private readonly headerId = this.route.snapshot.paramMap.get('headerId') ?? '';

  protected readonly designationHeaderState = toSignal(
    this.bo.getHeaderDetailStream(this.headerId).pipe(
      map((detail) => ({ loaded: true, detail })),
      catchError(() => of({ loaded: true, detail: undefined as DesignationsHeaderDetail | undefined })),
    ),
    { initialValue: { loaded: false, detail: undefined as DesignationsHeaderDetail | undefined } },
  );

  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly designations = signal<ReadonlyMap<string, Designation | null>>(new Map());
  protected readonly loadingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly rowsById = computed(() => {
    const detail = this.designationHeaderState().detail;
    const rows = new Map<string, DesignationTerritoryRow[]>();
    if (!detail) return rows;
    for (const [id, designation] of this.designations()) {
      if (designation) rows.set(id, DesignationsHistoryBO.buildTerritoryRows(designation, detail.rawTerritories));
    }
    return rows;
  });

  protected handleToggle(id: string): void {
    const isExpanding = !this.expandedIds().has(id);
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (isExpanding) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    if (!isExpanding || this.designations().has(id)) return;

    this.loadingIds.update((current) => new Set(current).add(id));
    this.bo
      .getDesignation(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(undefined)),
        finalize(() => {
          this.loadingIds.update((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }),
      )
      .subscribe((designation) => {
        this.designations.update((cache) => new Map(cache).set(id, designation ?? null));
      });
  }

  protected handleShare(id: string): void {
    shareDesignationLink(id);
  }
}
