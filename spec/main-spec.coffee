require('./helpers')

fs = require('fs')
path = require('path')
glob = require('glob')
refaker = require('../lib')

glob.sync(path.join(__dirname, 'core/**/*.json')).forEach (file) ->
  JSON.parse(fs.readFileSync(file)).forEach (suite) ->
    filename = path.relative(path.join(__dirname, 'core'), file)

    describe "#{suite.description} (#{filename})", ->
      beforeEach ->
        jasmine.addMatchers(customMatchers)

      suite.tests.forEach (test) ->
        it test.description, (done) ->
          refaker(
            schemas: [test.schema]
            fakeroot: 'http://test.example.com'
            directory: path.join(__dirname, 'schemas')
          )
          .then (result) ->
            try
              if test.data
                expect(test.data).toConformSchema [result.schemas[0], result.refs]

              if test.refs
                for ref in test.refs
                  expect(Object.keys(result.refs)).toContain ref

              if test.throws
                if typeof test.throws is 'string'
                  expect(result.err.toString()).toContain test.throws
                else throw result.err if result.err
            catch e
              console.log 'THIS SHOULD NOT HAPPEN', e.message

            done()
