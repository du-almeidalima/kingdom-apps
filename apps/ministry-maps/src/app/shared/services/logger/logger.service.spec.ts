import { TestBed } from '@angular/core/testing';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

import { LoggerService, LogLevelEnum } from './logger.service';
import { FIRESTORE } from '../../../repositories/firebase/firebase-providers';
import { environment } from '../../../../environments/environment';
import { UserStateService } from '../../../state/user.state.service';
import { congregationMock, userMockBuilder } from '../../../../test/mocks';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

describe('LoggerService', () => {
  let service: LoggerService;
  let metadata: object = { file: 'test.ts' };
  const locationUrl = window.location.href;
  const userAgent = navigator.userAgent;

  // Setup for all tests
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FIRESTORE, useValue: {} }],
    });

    service = TestBed.inject(LoggerService);

    // Mock Implementations
    (addDoc as jest.Mock).mockResolvedValue({ id: 123 });
    (collection as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
    metadata = { file: 'test.ts' };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('log levels', () => {
    it('should log DEBUG level messages', async () => {
      const message = 'Debug message';

      await service.debug(message, metadata);

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.DEBUG,
        message,
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          ...metadata,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });

    it('should log INFO level messages', async () => {
      const message = 'Info message';

      await service.info(message, metadata);

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.INFO,
        message,
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          ...metadata,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });

    it('should log WARN level messages', async () => {
      const message = 'Warning message';

      await service.warn(message, metadata);

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.WARN,
        message,
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          ...metadata,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });

    it('should log ERROR level messages', async () => {
      const message = 'Error message';
      const metadata = { error: new Error('Test error') };

      await service.error(message, metadata);

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.ERROR,
        message,
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          ...metadata,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });
  });

  describe('retention policy', () => {
    it('should set expireAt 6 months (180 days) after creation', async () => {
      const before = Date.now();

      await service.info('Retention message');

      const after = Date.now();
      const entry = (addDoc as jest.Mock).mock.calls[0][1];
      const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

      expect(entry.expireAt).toBeInstanceOf(Timestamp);
      expect(entry.expireAt.toMillis()).toBeGreaterThanOrEqual(before + sixMonthsMs);
      expect(entry.expireAt.toMillis()).toBeLessThanOrEqual(after + sixMonthsMs);
    });
  });

  describe('error handling', () => {
    it('should handle errors when logging', async () => {
      // Set up addDoc to fail the first time
      const error = new Error('Firestore error');
      (addDoc as jest.Mock).mockRejectedValueOnce(error);
      (addDoc as jest.Mock).mockResolvedValueOnce({});

      const message = 'Original message';

      await service.info(message, metadata);

      // Should have made two calls to addDoc
      expect(addDoc).toHaveBeenCalledTimes(2);

      // The second call should be an error log with the original error
      expect(addDoc).toHaveBeenLastCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.ERROR,
        message: 'Error while logging entry',
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          logExceptionMetadata: {
            ...metadata,
            error,
          },
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });

    it('should prevent recursive error logging', async () => {
      // Set up addDoc to fail with each call
      const error = new Error('Firestore error');
      (addDoc as jest.Mock).mockRejectedValue(error);

      // Try to log an error with the same message that triggers recursion prevention
      await expect(service.error('Error while logging entry')).rejects.toThrow(error);

      // Should only try once because of recursion guard
      expect(addDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('default parameters', () => {
    it('should use empty object as default metadata', async () => {
      const message = 'Message with no metadata';

      await service.info(message);

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.INFO,
        message,
        metadata: {
          userId: null,
          userEmail: null,
          congregationId: null,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });
  });
  describe('user and congregation context', () => {
    it('should include userId, userEmail, and congregationId in metadata when a user is logged in', async () => {
      const userState = new UserStateService();
      const mockUser = userMockBuilder({ congregation: congregationMock });
      userState.setUser(mockUser);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: FIRESTORE, useValue: {} },
          { provide: UserStateService, useValue: userState },
        ],
      });
      const localService = TestBed.inject(LoggerService);

      await localService.info('Message with user context');

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.INFO,
        message: 'Message with user context',
        metadata: {
          userId: mockUser.id,
          userEmail: mockUser.email,
          congregationId: congregationMock.id,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });

    it('should allow caller metadata to override userId, userEmail, and congregationId', async () => {
      const userState = new UserStateService();
      userState.setUser(userMockBuilder({ congregation: congregationMock }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: FIRESTORE, useValue: {} },
          { provide: UserStateService, useValue: userState },
        ],
      });
      const localService = TestBed.inject(LoggerService);

      await localService.info('Overridden context', {
        userId: 'custom-user-id',
        userEmail: 'custom@example.com',
        congregationId: 'custom-congregation-id',
      });

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        timestamp: expect.any(Date),
        expireAt: expect.any(Timestamp),
        level: LogLevelEnum.INFO,
        message: 'Overridden context',
        metadata: {
          userId: 'custom-user-id',
          userEmail: 'custom@example.com',
          congregationId: 'custom-congregation-id',
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });
  });
});
