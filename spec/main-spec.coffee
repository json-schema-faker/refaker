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

specFilter = require('grunt').cli.options.spec or ''

glob.sync(path.join(__dirname, 'core/**/*.json')).forEach (file) ->
  return if file.indexOf(specFilter) is -1

  JSON.parse(fs.readFileSync(file)).forEach (suite) ->
    filename = path.relative(path.join(__dirname, 'core'), file)

    describe "#{suite.description} (#{filename})", ->
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
              else throw err if err

            if test.data
              expect(test.data).toHaveSchema schemas[0], refs

            if test.refs
              for ref in test.refs
                expect(Object.keys(refs)).toContain ref

            done()
