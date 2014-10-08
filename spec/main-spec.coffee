path = require('path')

refaker = require('../lib')

describe 'resolving $ref values', ->
  it 'should resolve local, external and inline references', (done) ->
    schema = require('./fixtures/parent/schema.json')
    data = require('./fixtures/example.json')

    refaker
      schemas: [schema]
      fakeroot: 'http://example.com',
      directory: path.resolve(__dirname + '/fixtures')
    , (err, refs) ->
      expect(data).toHaveSchema schema, refs
      done(err)
