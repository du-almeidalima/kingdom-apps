import { TerritoryGenericAlertDialogComponent } from './territory-generic-alert-dialog.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { EMPTY, of, take, timer } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

describe('TerritoryGenericAlertDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryGenericAlertDialogComponent)
      .provide({
        provide: DialogRef,
        useValue: {
          close: jest.fn(),
        },
      })
      .provide({
        provide: DIALOG_DATA,
        useValue: {
          history: [],
          markAsResolvedCallback: () => {
            return EMPTY;
          },
        },
      })
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryGenericAlertDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should handle isSubmitting state correctly during async operation', fakeAsync(() => {
    const requestTimeMs = 500;
    // An Observable that completes after 500 milliseconds
    const markAsResolvedCallbackMock = jest.fn().mockReturnValue(timer(0, requestTimeMs).pipe(take(1)));

    const fixture = MockRender(
      TerritoryGenericAlertDialogComponent,
      {},
      {
        providers: [
          {
            provide: DIALOG_DATA,
            useValue: {
              history: [],
              markAsResolvedCallback: markAsResolvedCallbackMock,
            },
          },
        ],
      }
    );

    const component = fixture.point.componentInstance;

    component.handleResolveAlert();
    expect(component.isSubmitting).toBeTruthy();

    tick(requestTimeMs);
    expect(component.isSubmitting).toBeFalsy();
  }));

  it('should call markAsResolvedCallback with history data', () => {
    const mockHistory = [
      {
        id: '1',
        notes: 'Test Note',
        isRevisit: true,
        date: new Date(),
        visitOutcome: VisitOutcomeEnum.SPOKE,
      },
    ];

    const markAsResolvedCallbackMock = jest.fn().mockReturnValue(EMPTY);

    const fixture = MockRender(
      TerritoryGenericAlertDialogComponent,
      {},
      {
        providers: [
          {
            provide: DIALOG_DATA,
            useValue: {
              history: mockHistory,
              markAsResolvedCallback: markAsResolvedCallbackMock,
              title: 'Test Title',
              message: 'Test Message',
            },
          },
        ],
      }
    );

    const component = fixture.point.componentInstance;
    component.handleResolveAlert();

    expect(markAsResolvedCallbackMock).toHaveBeenCalledWith(mockHistory);
  });

  it('should close dialog with true when callback succeeds', () => {
    const fixture = MockRender(
      TerritoryGenericAlertDialogComponent,
      {},
      {
        providers: [
          {
            provide: DIALOG_DATA,
            useValue: {
              history: [],
              markAsResolvedCallback: () => {
                return of(true);
              },
            },
          },
        ],
      }
    );

    const mockDialogRef = ngMocks.get(DialogRef);

    const component = fixture.point.componentInstance;
    component.handleResolveAlert();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
