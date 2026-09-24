const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const ENVIRONMENT_FILE = 'apps/ministry-maps/src/environments/environment.ts';
const SOURCE_ROOTS = ['apps/ministry-maps/src', 'libs/common-ui/src'];
const ENV_TOKEN_REGEX = /process\.env(?:\.(NX_[A-Z0-9_]+)|\[['"](NX_[A-Z0-9_]+)['"]\])/g;
const SKIPPED_FILE_REGEX = /\.(spec|test)\.ts$/;

function* walkSourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walkSourceFiles(path);
    } else if (path.endsWith('.ts')) {
      yield path;
    }
  }
}

const defineEnvPlugin = {
  name: 'nx-define-env',
  setup(build) {
    const root = build.initialOptions.absWorkingDir ?? process.cwd();
    const environmentFilePath = join(root, ENVIRONMENT_FILE);

    const keys = new Set();
    for (const [, dottedKey, bracketedKey] of readFileSync(environmentFilePath, 'utf8').matchAll(ENV_TOKEN_REGEX)) {
      keys.add(dottedKey ?? bracketedKey);
    }

    const env = { NODE_ENV: process.env.NODE_ENV };
    for (const key of keys) {
      env[key] = process.env[key];
    }

    for (const sourceRoot of SOURCE_ROOTS) {
      for (const file of walkSourceFiles(join(root, sourceRoot))) {
        if (SKIPPED_FILE_REGEX.test(file) || file === environmentFilePath) {
          continue;
        }
        if (readFileSync(file, 'utf8').includes('process.env')) {
          throw new Error(
            `[nx-define-env] ${relative(root, file)} reads process.env. ` +
              `Build-time environment variables are only supported in ${ENVIRONMENT_FILE}; move the read there.`,
          );
        }
      }
    }

    build.initialOptions.define ??= {};
    build.initialOptions.define['process.env'] = JSON.stringify(env);
  },
};

module.exports = defineEnvPlugin;
