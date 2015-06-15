tv4 = require('tv4')
clone = require('clone')

refCount = (node, acc = 0) ->
  acc += 1 if node.$ref

  for id, value of node
    if typeof value is 'object'
      acc += refCount(value)

  acc

jasmine.Matchers::toHaveRefs = (expected = 0) ->
  if expected isnt nodes = refCount @actual
    throw new Error "Invalid $ref count #{nodes}, expected #{expected}"

  true

jasmine.Matchers::toHaveSchema = (expected, refs) ->
  api = tv4.freshApi()
  api.addSchema(id, clone(schema)) for id, schema of refs if refs

  result = api.validateResult(@actual, clone(expected), false, false)

  throw 'Missing ' + result.missing.join(', ') if result.missing.length

  throw result.error.message if result.error

  true
