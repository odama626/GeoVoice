
const config = require('./webpack.config.builder');
const path = require('path');


module.exports = config.buildConfig((config, { defaultLoaders, defaultRules }) => {

  let scssOptions = {
    includePaths: ['src/styles'],
    data: `@import 'vars.scss';`
  }

  let rules = [
    defaultRules.ts(),
    defaultRules.scssModules(scssOptions),
    defaultRules.scss(),
    defaultRules.cssModules(scssOptions),
    defaultRules.css(),
    defaultRules.html()
  ]

  config.entry = './src/app/entrypoint.tsx';
  config.module.rules = rules;
  config.resolve.extensions.push('.ts', '.tsx');
  config.resolve.alias = {
    "components": path.resolve(__dirname, 'src/components/'),
    'utils': path.resolve(__dirname, 'src/utils.ts'),
    'app': path.resolve(__dirname, 'src/app/'),
    'styles': path.resolve(__dirname, 'src/styles/')
  }
  config.node = { fs: 'empty' };
  config.target = 'web';
  return config;
});