require('./helpers')

fs = require('fs')
path = require('path')
glob = require('glob')
refaker = require('../lib')

describe 'other specs', ->
  it 'should fail on invalid input', (done) ->
    refaker {}, (err, refs) ->
      expect(err).toBeUndefined()
      expect(refs).toEqual {}

      expect(refaker).toThrow()
      expect(-> refaker({})).toThrow()
      expect(-> refaker(schemas: -1)).toThrow()
      done()

glob.sync(path.join(__dirname, 'core/**/*.json')).forEach (file) ->
  JSON.parse(fs.readFileSync(file)).forEach (suite) ->
    describe "#{suite.description} (#{path.relative(path.join(__dirname, 'core'), file)})", ->
      suite.tests.forEach (test) ->
        it test.description, (done) ->
          refaker
            schemas: [test.schema]
            fakeroot: 'http://test.example.com'
            directory: path.join(__dirname, 'schemas')
          , (err, refs, schemas) ->
            if test.throws
              if typeof test.throws is 'string'
                expect(err.toString()).toContain test.throws
            else
              throw err if err

              expect(test.data).toHaveSchema schemas[0], refs

            if test.refs
              for ref in test.refs
                expect(Object.keys(refs)).toContain ref

            done()
