require('./helpers')

fs = require('fs')
path = require('path')
glob = require('glob')
refaker = require('../lib')

glob.sync(path.join(__dirname, 'core/**/*.json')).forEach (file) ->
  JSON.parse(fs.readFileSync(file)).forEach (suite) ->
    describe "#{suite.description} (#{path.relative(path.join(__dirname, 'core'), file)})", ->
      suite.tests.forEach (test) ->
        it test.description, (done) ->
          refaker
            schema: test.schema
            fakeroot: 'http://test.example.com'
            directory: path.join(__dirname, 'schemas')
          , (err, refs, schema) ->
            throw err if err

            expect(test.data).toHaveSchema schema, refs

            done()
