jasmine.Matchers::toHaveSchema = (expected, refs) ->
  tv4 = require('tv4').freshApi()
  tv4.addSchema(id, schema) for id, schema of refs

  result = tv4.validateResult(@actual, expected)

  not (result.error or result.missing.length) and result.valid
