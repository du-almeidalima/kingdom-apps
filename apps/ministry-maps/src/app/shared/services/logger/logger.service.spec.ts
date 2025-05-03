import { TestBed } from '@angular/core/testing';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { MockProvider } from 'ng-mocks';

import { LoggerService, LogLevelEnum } from './logger.service';
import { environment } from '../../../../environments/environment';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

describe('LoggerService', () => {
  let service: LoggerService;
  let metadata: object = { file: 'test.ts' };
  const locationUrl = 'http://localhost-test.com';
  const userAgent = 'Test User Agent';

  // Setup for all tests
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(Firestore)],
    });

    service = TestBed.inject(LoggerService);

    // Mock Implementations
    (addDoc as jest.Mock).mockResolvedValue({ id: 123 });
    (collection as jest.Mock).mockReturnValue({});

    // Spy on the original window and navigator
    Object.defineProperty(window, 'location', {
      value: { href: locationUrl },
    });

    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
    });
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
        level: LogLevelEnum.DEBUG,
        message,
        metadata: {
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
        level: LogLevelEnum.INFO,
        message,
        metadata: {
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
        level: LogLevelEnum.WARN,
        message,
        metadata: {
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
        level: LogLevelEnum.ERROR,
        message,
        metadata: {
          ...metadata,
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
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
        level: LogLevelEnum.ERROR,
        message: 'Error while logging entry',
        metadata: {
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
        level: LogLevelEnum.INFO,
        message,
        metadata: {
          environment: environment.env,
          url: locationUrl,
          userAgent,
        },
      });
    });
  });
});
