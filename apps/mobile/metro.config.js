// Metro config for the pnpm monorepo.
//
// @joy-curry/core and @joy-curry/tokens ship RAW TypeScript source
// (package.json exports point at ./src/index.ts), so Metro must both SEE the
// workspace packages (watchFolders) and TRANSPILE them (babel-preset-expo
// already transforms everything inside watchFolders — do not exclude them).
//
// pnpm keeps each package's deps in isolated symlinked node_modules
// (packages/core/node_modules/nanostores -> ../.pnpm/...). Metro follows
// symlinks by default since 0.79, and hierarchical lookup is what lets a file
// in packages/core/src resolve its own deps — so hierarchical lookup must
// stay ENABLED (the usual monorepo advice to disable it breaks pnpm here).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
