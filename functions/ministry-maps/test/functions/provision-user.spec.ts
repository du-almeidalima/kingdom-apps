import { provisionUserFromInvite, ProvisionUserRequest } from '../../src/functions/provision-user';
import { db } from '../../src/config/firebase';
import { HttpsError } from 'firebase-functions/v2/https';
import type { PublicUser } from '../../src/models/user';

jest.mock('../../src/config/firebase', () => {
  const mockDb = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };
  return {
    db: mockDb,
  };
});

interface MockCallableRequest<TData> {
  auth?: {
    uid: string;
    token: Record<string, unknown>;
  };
  data: TData;
}

type CallableRunner<TData, TResult> = {
  run: (req: MockCallableRequest<TData>) => Promise<TResult>;
};

const provisionUserRunner = provisionUserFromInvite as unknown as CallableRunner<ProvisionUserRequest, PublicUser>;

describe('provisionUserFromInvite Cloud Function', () => {
  const mockCollection = db.collection as jest.Mock;
  const mockRunTransaction = db.runTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws unauthenticated HttpsError when request.auth is missing', async () => {
    await expect(
      provisionUserRunner.run({
        auth: undefined,
        data: { inviteId: 'inv-123' },
      }),
    ).rejects.toThrow(HttpsError);
  });

  it('throws invalid-argument HttpsError when inviteId is missing or empty', async () => {
    await expect(
      provisionUserRunner.run({
        auth: { uid: 'user-1', token: { email: 'user@example.com' } },
        data: { inviteId: '' },
      }),
    ).rejects.toThrow(HttpsError);
  });

  it('returns existing user profile idempotently without running transaction if user doc already exists', async () => {
    const existingUserData = {
      id: 'existing-user',
      name: 'Existing User',
      email: 'existing@example.com',
      photoUrl: 'https://example.com/pic.jpg',
      role: 'PUBLISHER',
      congregation: { id: 'cong-1' },
    };

    const mockDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => existingUserData,
      }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockDoc),
    });

    const result = await provisionUserRunner.run({
      auth: { uid: 'existing-user', token: { email: 'existing@example.com' } },
      data: { inviteId: 'inv-123' },
    });

    expect(result).toEqual({
      id: 'existing-user',
      name: 'Existing User',
      email: 'existing@example.com',
      photoUrl: 'https://example.com/pic.jpg',
      role: 'PUBLISHER',
      congregationId: 'cong-1',
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('throws not-found HttpsError when invitation does not exist', async () => {
    const mockUserDoc = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDoc),
    });

    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      return callback(mockTransaction);
    });

    await expect(
      provisionUserRunner.run({
        auth: { uid: 'new-user', token: { email: 'new@example.com' } },
        data: { inviteId: 'missing-inv' },
      }),
    ).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('throws failed-precondition INVITATION_ALREADY_USED when invitation is invalid', async () => {
    const mockUserDoc = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDoc),
    });

    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ isValid: false, role: 'PUBLISHER' }),
        }),
      };
      return callback(mockTransaction);
    });

    await expect(
      provisionUserRunner.run({
        auth: { uid: 'new-user', token: { email: 'new@example.com' } },
        data: { inviteId: 'used-inv' },
      }),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'INVITATION_ALREADY_USED',
    });
  });

  it('throws permission-denied when invitation role is APP_ADMIN', async () => {
    const mockUserDoc = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDoc),
    });

    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ isValid: true, role: 'APP_ADMIN' }),
        }),
      };
      return callback(mockTransaction);
    });

    await expect(
      provisionUserRunner.run({
        auth: { uid: 'new-user', token: { email: 'new@example.com' } },
        data: { inviteId: 'app-admin-inv' },
      }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('throws permission-denied INVALID_EMAIL when token email does not match pinned invite email', async () => {
    const mockUserDoc = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDoc),
    });

    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            isValid: true,
            role: 'PUBLISHER',
            email: 'intended@example.com',
          }),
        }),
      };
      return callback(mockTransaction);
    });

    await expect(
      provisionUserRunner.run({
        auth: { uid: 'new-user', token: { email: 'attacker@example.com' } },
        data: { inviteId: 'pinned-inv' },
      }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'INVALID_EMAIL',
    });
  });

  it('successfully provisions user and consumes invitation atomically in transaction', async () => {
    const mockUserDoc = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDoc),
    });

    const mockInvite = {
      isValid: true,
      role: 'PUBLISHER',
      congregation: { id: 'cong-1' },
      email: 'new.user@example.com',
    };

    let setPayload: Record<string, unknown> | null = null;
    let updatePayload: Record<string, unknown> | null = null;

    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest
          .fn()
          // First get is inviteRef
          .mockResolvedValueOnce({
            exists: true,
            data: () => mockInvite,
          })
          // Second get is userRef
          .mockResolvedValueOnce({
            exists: false,
          }),
        set: jest.fn((_ref: unknown, data: Record<string, unknown>) => {
          setPayload = data;
        }),
        update: jest.fn((_ref: unknown, data: Record<string, unknown>) => {
          updatePayload = data;
        }),
      };
      return callback(mockTransaction);
    });

    const result = await provisionUserRunner.run({
      auth: {
        uid: 'new-uid-123',
        token: {
          email: 'NEW.USER@EXAMPLE.COM',
          name: 'New User Name',
          picture: 'https://example.com/avatar.jpg',
        },
      },
      data: { inviteId: 'valid-inv-123' },
    });

    expect(result).toEqual({
      id: 'new-uid-123',
      name: 'New User Name',
      email: 'NEW.USER@EXAMPLE.COM',
      photoUrl: 'https://example.com/avatar.jpg',
      role: 'PUBLISHER',
      congregationId: 'cong-1',
    });

    expect(setPayload).toMatchObject({
      id: 'new-uid-123',
      role: 'PUBLISHER',
      email: 'NEW.USER@EXAMPLE.COM',
      name: 'New User Name',
      photoUrl: 'https://example.com/avatar.jpg',
      congregation: { id: 'cong-1' },
    });

    expect(updatePayload).toMatchObject({
      isValid: false,
      usedBy: 'NEW.USER@EXAMPLE.COM',
    });
  });
});
