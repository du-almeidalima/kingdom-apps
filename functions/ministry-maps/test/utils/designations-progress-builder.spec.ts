import { Timestamp } from 'firebase-admin/firestore';

import { DesignationsHeaderDoc } from '../../src/models/designations-header';
import { VisitOutcomeEnum } from '../../src/models/designations-progress';
import { buildDesignationsProgress } from '../../src/utils/designations-progress-builder';

describe('buildDesignationsProgress', () => {
  const createdAt = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
  const expiresAt = Timestamp.fromDate(new Date('2026-02-01T00:00:00Z'));
  const header: DesignationsHeaderDoc = {
    id: 'H1', congregationId: 'C1', status: 'DONE', createdAt, createdBy: 'U1',
  };

  it('builds designation totals and completed entries from only the latest DONE history', () => {
    const completedAt = Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'));
    const { progress, skipped } = buildDesignationsProgress(header, [{
      id: 'D1', createdAt, expiresAt, territories: [
        { id: 'T1', status: 'DONE', history: [
          { date: createdAt, visitOutcome: VisitOutcomeEnum.MOVED },
          { date: completedAt, visitOutcome: VisitOutcomeEnum.SPOKE },
        ] },
        { id: 'T2', status: 'PENDING', history: [] },
      ],
    }]);

    expect(progress.designations.D1).toEqual({ territoriesTotal: 2, createdAt, expiresAt });
    expect(progress.territories).toEqual({ D1_T1: {
      designationId: 'D1', territoryId: 'T1', outcome: VisitOutcomeEnum.SPOKE, completedAt,
    } });
    expect(skipped).toEqual([]);
  });

  it('returns DONE territories without history in skipped and applies the 180-day TTL fallback', () => {
    const { progress, skipped } = buildDesignationsProgress(header, [{
      id: 'D1', createdAt, expiresAt, territories: [{ id: 'T1', status: 'DONE' }],
    }]);
    expect(skipped).toEqual([{ designationId: 'D1', territoryId: 'T1' }]);
    expect(progress.territories).toEqual({});
    expect(progress.expireAt.toDate()).toEqual(new Date(createdAt.toDate().getTime() + 180 * 24 * 60 * 60 * 1000));
  });

  it('preserves an explicit header TTL date', () => {
    const expireAt = Timestamp.fromDate(new Date('2027-01-01T00:00:00Z'));
    const { progress } = buildDesignationsProgress({ ...header, expireAt }, []);
    expect(progress.expireAt).toBe(expireAt);
  });

  it('skips DONE territories with malformed history entries missing date or visitOutcome', () => {
    const { skipped } = buildDesignationsProgress(header, [{
      id: 'D1', createdAt, expiresAt, territories: [
        { id: 'T1', status: 'DONE', history: [{ date: createdAt } as unknown as { date: Timestamp; visitOutcome: VisitOutcomeEnum }] },
        { id: 'T2', status: 'DONE', history: [{ visitOutcome: VisitOutcomeEnum.SPOKE } as unknown as { date: Timestamp; visitOutcome: VisitOutcomeEnum }] },
      ],
    }]);
    expect(skipped).toEqual([
      { designationId: 'D1', territoryId: 'T1' },
      { designationId: 'D1', territoryId: 'T2' },
    ]);
  });
});
