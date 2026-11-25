import { Injectable, inject } from '@angular/core';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import type { CollectionReference } from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import { FIRESTORE } from '../../../repositories/firebase/firebase-providers';
import { UserStateService } from '../../../state/user.state.service';

export type LogMetadata = {
  userId?: string | null;
  userEmail?: string | null;
  congregationId?: string | null;
  userAgent?: string;
  url?: string;
  environment?: string;
  [key: string]: unknown;
};

export type LogEntry = {
  timestamp: Date;
  expireAt: Timestamp;
  level: string;
  message: string;
  metadata: LogMetadata;
};

export enum LogLevelEnum {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly firestore = inject(FIRESTORE);
  private readonly userState = inject(UserStateService, { optional: true });

  // TTL retention: 6 months
  private static readonly RETENTION_DAYS = 180;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly logsCollection: CollectionReference;

  constructor() {
    this.logsCollection = collection(this.firestore, 'logs');
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata: object = {}): Promise<string> {
    return this.log(LogLevelEnum.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata: object = {}): Promise<string> {
    return this.log(LogLevelEnum.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata: object = {}): Promise<string> {
    return this.log(LogLevelEnum.WARN, message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, metadata: object = {}): Promise<string> {
    return this.log(LogLevelEnum.ERROR, message, metadata);
  }

  /**
   * Create a log entry with specified level
   */
  private async log(level: LogLevelEnum, message: string, metadata: object = {}): Promise<string> {
    try {
      const currentUser = this.userState?.currentUser;
      const userId = currentUser?.id ?? null;
      const userEmail = currentUser?.email ?? null;
      const congregationId = currentUser?.congregation?.id ?? null;

      const logEntry: LogEntry = {
        timestamp: new Date(),
        expireAt: Timestamp.fromDate(new Date(Date.now() + LoggerService.RETENTION_DAYS * LoggerService.MS_PER_DAY)),
        level: level,
        message,
        metadata: {
          userId,
          userEmail,
          congregationId,
          ...metadata,
          userAgent: navigator.userAgent,
          url: window.location.href,
          environment: environment.env,
        },
      };

      const docRef = await addDoc(this.logsCollection, logEntry);

      return docRef.id;
    } catch (error) {
      const exceptionMessage = 'Error while logging entry';
      if (message === exceptionMessage) {
        // Stop endless error recursion
        throw error;
      }

      const logExceptionMetadata = {
        ...metadata,
        error: error,
      };

      return await this.log(LogLevelEnum.ERROR, exceptionMessage, { logExceptionMetadata });
    }
  }
}
