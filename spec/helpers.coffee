Ajv = require('ajv')
clone = require('clone')

global.customMatchers =
  toConformSchema: ->
    compare: (actual, expected) ->
      [ expected, refs ] = expected if Array.isArray(expected)

      fail = []

      ajv = new Ajv()

      if refs
        for k, s of refs
          ajv.addSchema(clone(s), k)

      validate = ajv.compile expected
      valid = validate actual

      unless valid
        console.log(validate.errors)

      pass: !fail.length
      message: fail.join('\n') if fail.length
