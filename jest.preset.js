const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  setupFiles: [...(nxPreset.setupFiles || []), './jest.setup.js'],
};
