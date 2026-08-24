import { deleteUser } from '../../src/functions/delete-user';
import { db, auth } from '../../src/config/firebase';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

jest.mock('../../src/config/firebase', () => {
  const mockDb = {
    collection: jest.fn(),
  };
  const mockAuth = {
    deleteUser: jest.fn(),
  };
  return {
    db: mockDb,
    auth: mockAuth,
  };
});

type CallableRunner<TData, TResult> = {
  run: (req: Partial<CallableRequest<TData>>) => Promise<TResult>;
};

const deleteUserRunner = deleteUser as unknown as CallableRunner<string, void>;

describe('deleteUser Cloud Function', () => {
  const mockCollection = db.collection as jest.Mock;
  const mockDeleteAuthUser = auth.deleteUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws unauthenticated HttpsError when caller is not authenticated', async () => {
    await expect(
      deleteUserRunner.run({
        auth: undefined,
        data: 'target-user-id',
      }),
    ).rejects.toThrow(HttpsError);
  });

  it('exits early without error when data is missing or empty', async () => {
    const result = await deleteUserRunner.run({
      auth: { uid: 'caller-admin' } as CallableRequest<string>['auth'],
      data: '',
    });

    expect(result).toBeUndefined();
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('exits early when target user is not found in Firestore', async () => {
    const mockDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ id: 'caller-admin', role: 'ADMIN' }) }),
    };
    const mockWhere = {
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnValue(mockWhere),
    });

    await deleteUserRunner.run({
      auth: { uid: 'caller-admin' } as CallableRequest<string>['auth'],
      data: 'non-existent-user',
    });

    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  it('deletes auth account when caller is ADMIN and target user is in same congregation', async () => {
    const callerData = {
      id: 'caller-admin',
      role: 'ADMIN',
      congregation: { id: 'cong-1' },
    };
    const targetData = {
      id: 'target-user',
      role: 'PUBLISHER',
      congregation: { id: 'cong-1' },
    };

    const mockCallerDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => callerData }),
    };
    const mockTargetQuery = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => targetData }],
      }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockCallerDoc),
      where: jest.fn().mockReturnValue(mockTargetQuery),
    });
    mockDeleteAuthUser.mockResolvedValue(undefined);

    await deleteUserRunner.run({
      auth: { uid: 'caller-admin' } as CallableRequest<string>['auth'],
      data: 'target-user',
    });

    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-user');
  });

  it('does not delete auth account when caller is ADMIN and target user is in different congregation', async () => {
    const callerData = {
      id: 'caller-admin',
      role: 'ADMIN',
      congregation: { id: 'cong-1' },
    };
    const targetData = {
      id: 'target-user',
      role: 'PUBLISHER',
      congregation: { id: 'cong-2' },
    };

    const mockCallerDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => callerData }),
    };
    const mockTargetQuery = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => targetData }],
      }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockCallerDoc),
      where: jest.fn().mockReturnValue(mockTargetQuery),
    });

    await deleteUserRunner.run({
      auth: { uid: 'caller-admin' } as CallableRequest<string>['auth'],
      data: 'target-user',
    });

    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  it('deletes auth account when caller is APP_ADMIN regardless of congregation', async () => {
    const callerData = {
      id: 'caller-app-admin',
      role: 'APP_ADMIN',
    };
    const targetData = {
      id: 'target-user',
      role: 'ADMIN',
      congregation: { id: 'cong-other' },
    };

    const mockCallerDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => callerData }),
    };
    const mockTargetQuery = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => targetData }],
      }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockCallerDoc),
      where: jest.fn().mockReturnValue(mockTargetQuery),
    });
    mockDeleteAuthUser.mockResolvedValue(undefined);

    await deleteUserRunner.run({
      auth: { uid: 'caller-app-admin' } as CallableRequest<string>['auth'],
      data: 'target-user',
    });

    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-user');
  });

  it('safely catches and logs errors if auth.deleteUser fails without unhandled throw', async () => {
    const callerData = {
      id: 'caller-admin',
      role: 'ADMIN',
      congregation: { id: 'cong-1' },
    };
    const targetData = {
      id: 'target-user',
      role: 'PUBLISHER',
      congregation: { id: 'cong-1' },
    };

    const mockCallerDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => callerData }),
    };
    const mockTargetQuery = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => targetData }],
      }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockCallerDoc),
      where: jest.fn().mockReturnValue(mockTargetQuery),
    });
    mockDeleteAuthUser.mockRejectedValue(new Error('auth/user-not-found'));

    await expect(
      deleteUserRunner.run({
        auth: { uid: 'caller-admin' } as CallableRequest<string>['auth'],
        data: 'target-user',
      }),
    ).resolves.not.toThrow();

    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-user');
  });
});
