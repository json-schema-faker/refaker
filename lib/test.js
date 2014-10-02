var tv4 = require('tv4'),
    path = require('path')
    refaker = require('./index');

var schema = require('../schemas/parent/schema.json'),
    data = require('../schemas/example.json');

refaker({
  schema: schema,
  fakeroot: 'http://example.com',
  directory: path.resolve(__dirname + '/../schemas')
}, function(err, refs) {
  if (refs) {
    for (var id in refs) {
      tv4.addSchema(id, refs[id]);
    }
  }

  var result = tv4.validateResult(data, schema);

  if (result.error || result.missing.length) {
    console.log(result);
    process.exit(1);
  }

  console.log('OK');
});
