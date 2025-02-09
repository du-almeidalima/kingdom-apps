import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web';

// This seems to be an issue with Jest, it overwrites some of the jsdom properties
// It began to happen when I introduced the dexie dependency
// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest

Object.defineProperties(globalThis, {
  TextEncoder: {value: TextEncoder},
  TextDecoder: {value: TextDecoder},
  ReadableStream: {value: ReadableStream},
})

// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
};

import 'jest-preset-angular/setup-jest';
import './test/setup-test-mocks'
