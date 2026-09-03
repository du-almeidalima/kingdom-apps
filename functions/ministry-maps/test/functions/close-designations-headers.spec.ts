import { FieldValue } from 'firebase-admin/firestore';
import { closeDesignationsHeaders } from '../../src/functions/close-designations-headers';
import { db } from '../../src/config/firebase';

jest.mock('../../src/config/firebase', () => {
  const mockDb = {
    collection: jest.fn(),
    batch: jest.fn(),
  };
  return { db: mockDb, auth: {} };
});

type ScheduleRunner = {
  run: (context: unknown) => Promise<void>;
};

const closeRunner = closeDesignationsHeaders as unknown as ScheduleRunner;

const openDoc = (id: string) => ({ id, ref: { id } });

describe('closeDesignationsHeaders scheduled function', () => {
  const mockCollection = db.collection as jest.Mock;
  const mockBatch = db.batch as jest.Mock;

  const makeWhere = (result: { empty: boolean; docs: ReturnType<typeof openDoc>[] }) => ({
    where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(result) }),
  });

  let update: jest.Mock;
  let commit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    update = jest.fn();
    commit = jest.fn().mockResolvedValue(undefined);
    mockBatch.mockReturnValue({ update, commit });
  });

  const seedOpenHeaders = (count: number) => {
    const docs = Array.from({ length: count }, (_, i) => openDoc(`header-${i}`));

    mockCollection.mockReturnValue(makeWhere({ empty: count === 0, docs }));

    return docs;
  };

  it('queries every IN_PROGRESS header of designations_header', async () => {
    seedOpenHeaders(1);
    const where = mockCollection('designations_header').where as jest.Mock;

    await closeRunner.run({});

    expect(mockCollection).toHaveBeenCalledWith('designations_header');
    expect(where).toHaveBeenCalledWith('status', '==', 'IN_PROGRESS');
  });

  it('commits nothing when there are no open headers', async () => {
    seedOpenHeaders(0);

    await closeRunner.run({});

    expect(mockBatch).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it('closes every open header with DONE, serverTimestamp closedAt and CRON provenance', async () => {
    const docs = seedOpenHeaders(2);

    await closeRunner.run({});

    expect(update).toHaveBeenCalledTimes(2);
    for (const doc of docs) {
      expect(update).toHaveBeenCalledWith(doc.ref, {
        status: 'DONE',
        closedAt: expect.any(FieldValue),
        closedBy: 'CRON',
      });
    }
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('chunks updates into batches of at most 400 documents', async () => {
    seedOpenHeaders(801);

    await closeRunner.run({});

    // 801 docs → 400 + 400 + 1 → three batches/commits.
    expect(mockBatch).toHaveBeenCalledTimes(3);
    expect(commit).toHaveBeenCalledTimes(3);

    const updatesPerBatch = update.mock.calls.length;
    expect(updatesPerBatch).toBe(801);
    // No single batch received more than 400 update calls before its commit.
    const updateCallOrder = update.mock.invocationCallOrder;
    const commitCallOrder = commit.mock.invocationCallOrder;
    const updatesBeforeFirstCommit = updateCallOrder.filter((order) => order < commitCallOrder[0]).length;
    expect(updatesBeforeFirstCommit).toBe(400);
  });
});
