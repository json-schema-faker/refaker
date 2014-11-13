refCount = (node, acc = 0) ->
  acc += 1 if node.$ref

  for id, value of node
    if typeof value is 'object'
      acc += refCount(value)

  acc

jasmine.Matchers::toHaveRefs = (expected = 0) ->
  if expected isnt nodes = refCount @actual
    throw new Error "Invalid $ref count #{nodes}, expected #{expected}"

jasmine.Matchers::toHaveSchema = (expected) ->
  result = require('tv4').freshApi().validateResult(@actual, expected, true)

  throw result.error if result.error
