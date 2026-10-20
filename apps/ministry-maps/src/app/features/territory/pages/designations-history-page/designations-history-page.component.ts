import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonComponent, SpinnerComponent, ToasterService } from '@kingdom-apps/common-ui';
import { EMPTY, catchError, finalize } from 'rxjs';

import { UserStateService } from '../../../../state/user.state.service';
import { DesignationsHeader } from '../../../../../models/designations-header';
import { DesignationsHistoryBO } from '../../bo/designations-history/designations-history.bo';
import { DesignationsHeaderListItemComponent } from '../../components/designations-header-list-item/designations-header-list-item.component';

@Component({
  selector: 'kingdom-apps-designations-history-page',
  templateUrl: './designations-history-page.component.html',
  styleUrls: ['./designations-history-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SpinnerComponent, DesignationsHeaderListItemComponent],
})
export class DesignationsHistoryPageComponent implements OnInit {
  private readonly bo = inject(DesignationsHistoryBO);
  private readonly userState = inject(UserStateService);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly headers = signal<DesignationsHeader[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isLoadingMore = signal(false);

  ngOnInit(): void { this.loadPage(); }

  protected handleLoadMore(): void {
    const lastHeader = this.headers().at(-1);
    if (lastHeader) this.loadPage(lastHeader.createdAt);
  }

  private loadPage(cursor?: Date): void {
    const congregationId = this.userState.currentUser?.congregation?.id;
    if (!congregationId) throw new Error('A congregação do usuário atual não foi encontrada.');
    const isNextPage = !!cursor;
    (isNextPage ? this.isLoadingMore : this.isLoading).set(true);
    this.bo.getHeadersPage(congregationId, cursor).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => {
        this.toaster.error('Não foi possível carregar o histórico. Tente novamente.');
        return EMPTY;
      }),
      finalize(() => (isNextPage ? this.isLoadingMore : this.isLoading).set(false)),
    ).subscribe((page) => {
      this.headers.update((current) => isNextPage ? [...current, ...page.headers] : page.headers);
      this.hasMore.set(page.hasMore);
    });
  }
}
