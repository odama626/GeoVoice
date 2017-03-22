var david = require('david');

var manifest = {
  name: 'geovoice',
  dependencies: {
    'aaa': '~0.0.0',
    'bbb': '~0.0.0'
  },
  devDependencies: {
    'yyy': '~0.0.0',
    'zzz': '~0.0.0'
  }
};

david.getDependencies(manifest, function (er, deps) {
  console.log('latest dependencies information for', manifest.name);
  listDependencies(deps);
}
