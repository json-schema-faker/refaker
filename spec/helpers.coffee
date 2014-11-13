tv4 = require('tv4')

refCount = (node, acc = 0) ->
  acc += 1 if node.$ref

  for id, value of node
    if typeof value is 'object'
      acc += refCount(value)

  acc

jasmine.Matchers::toHaveRefs = (expected = 0) ->
  if expected isnt nodes = refCount @actual
    throw new Error "Invalid $ref count #{nodes}, expected #{expected}"

jasmine.Matchers::toHaveSchema = (expected, refs) ->
  api = tv4.freshApi()

  api.cyclicCheck = false;
  api.banUnknown = false;

  api.addSchema(id, json) for id, json of refs

  result = api.validateResult(@actual, expected, api.cyclicCheck, api.banUnknown)

  throw 'Missing ' + result.missing.join(', ') if result.missing.length

  throw result.error if result.error
