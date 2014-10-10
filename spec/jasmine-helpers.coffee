jasmine.Matchers::toHaveSchema = (expected, refs) ->
  tv4 = require('tv4').freshApi()
  tv4.addSchema(id, schema) for id, schema of refs

  result = tv4.validateResult(@actual, expected, on)

  throw 'Missing ' + result.missing.join(', ') if result.missing.length

  throw result.error if result.error

  result.valid
