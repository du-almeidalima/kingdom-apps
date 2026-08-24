require('whatwg-fetch');

// jsdom does not implement the `structuredClone` global that app code relies on.
// Rebuild it from the V8 serializer — the same structured-clone algorithm Node itself uses.
if (typeof globalThis.structuredClone === 'undefined') {
  const { deserialize, serialize } = require('node:v8');
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}
