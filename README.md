# A JSON-schema $ref faker

Inspired on [json-schema-validator](https://github.com/fge/json-schema-validator) for JAVA, the `--fakeroot` option, actually.

If you're validating some RAML (like me) then you should validate your JSON-schemas and examples also.

For this purpose I'm using [ramlev](https://github.com/cybertk/ramlev) which is using [tv4](https://github.com/geraintluff/tv4), but you're encouraged to download any `$ref` manually before validating.

## Solution?

```javascript
var tv4 = require('tv4'),
    refaker = require('refaker');

var data = { /* ... */ },
    schema = { /* ... */ };

refaker({
  schema: schema,
  fakeroot: 'http://example.com',
  directory: '/path/to/schemas'
}, function(err, refs) {
  if (refs) {
    for (var id in refs) {
      tv4.addSchema(id, refs[id]);
    }
  }

  console.log(tv4.validateResult(data, schema));
});
```

That's it.

## Build status

[![Build Status](https://travis-ci.org/gextech/refaker.png?branch=master)](https://travis-ci.org/gextech/refaker)
