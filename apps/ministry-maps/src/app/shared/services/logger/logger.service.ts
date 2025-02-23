import { Injectable } from '@angular/core';
import { addDoc, collection, CollectionReference, Firestore } from '@angular/fire/firestore';
import { environment } from '../../../../environments/environment';

export type LogEntry = {
  timestamp: Date;
  level: string;
  message: string;
  metadata: object;
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
  private readonly logsCollection: CollectionReference;

  constructor(private firestore: Firestore) {
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
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: level,
        message,
        metadata: {
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
