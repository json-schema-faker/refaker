var tv4 = require('tv4'),
    path = require('path')
    refaker = require('./index');

var schema = require('../schemas/parent/schema.json'),
    data = require('../schemas/example.json');

refaker({
  schemas: [schema],
  fakeroot: 'http://example.com',
  directory: path.resolve(__dirname + '/../schemas')
}, function(err, refs) {
  if (refs) {
    for (var id in refs) {
      tv4.addSchema(id, refs[id]);
    }
  }

  var result = tv4.validateResult(data, schema);

  if (err || result.error || result.missing.length) {
    console.log(err);
    console.log(result.missing);
    console.log(result.error ? result.error.message : result.error);

    process.exit(1);
  }

  console.log('OK');
});
