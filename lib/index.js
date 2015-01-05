'use strict';

var fs = require('fs'),
    path = require('path'),
    deref = require('deref'),
    Async = require('async-parts');

var fetchURL = {
  http: require('http'),
  https: require('https')
};

function parseJSON(text, uri) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('cannot parse ' + uri);
  }
}

function extractRefs(obj) {
  var set = [];

  for (var key in obj) {
    var value = obj[key];

    if (key === '$ref') {
      set.push(value);
    }

    if (typeof value === 'object') {
      set = set.concat(extractRefs(value));
    }
  }

  return set;
}

module.exports = function(params, callback) {
  var schemas = Array.isArray(params.schemas) ? params.schemas : Array.isArray(params.schema) ? params.schema : [params.schema];

  var schema_directory = params.directory || process.cwd(),
      normalized_fakeroot = typeof params.fakeroot === 'string' && (params.fakeroot.replace(/\/+$/g, '') + '/');

  var $ = deref(),
      _ = new Async();

  function downloadSchemas(from, parent) {
    function pushReference(schema) {
      if (typeof schema.id === 'string') {
        var base = $.util.resolveURL(parent, schema.id);

        base = $.util.getDocumentURI(base) || base;

        if (!$.refs[base]) {
          $.refs[base] = schema;
        }
      }
    }

    function fetchRefs(schema) {
      if (typeof schema.id === 'string') {
        extractRefs(schema).forEach(function(ref) {
          var url = $.util.getDocumentURI(ref);

          if ($.refs[url]) {
            return;
          }

          if (url.indexOf(normalized_fakeroot) === 0) {
            var file = path.join(schema_directory, url.replace(normalized_fakeroot, ''));

            if (fs.statSync(file).isFile()) {
              downloadSchemas(parseJSON(fs.readFileSync(file).toString(), file), url);
            }
          } else {
            _.then(function(next) {
              var req = fetchURL[url.split(':')[0]];

              req.get(url, function(res) {
                var body = '';

                res.on('data', function(chunk) {
                  body += chunk;
                });

                res.on('end', function() {
                  try {
                    next(downloadSchemas(parseJSON(body, url), url));
                  } catch (e) {
                    next(e);
                  }
                });
              }).on('error', function() {
                next(new Error('cannot reach ' + url));
              });
            });
          }
        });
      }
    }

    var fixed = $.util.normalizeSchema(parent, from, pushReference);

    pushReference(fixed);

    _.then(function(next) {
      fetchRefs(fixed);
      next();
    });
  }

  try {
    if (!Array.isArray(schemas)) {
      throw new Error('Invalid schemas "' + JSON.stringify(schemas) + '" (array expected)');
    }

    schemas.forEach(function(data) {
      downloadSchemas(data, normalized_fakeroot);
    });

    _.run(function(err) {
      callback(err, $.refs, schemas.map(function(data) {
        return $.util.normalizeSchema(normalized_fakeroot, data);
      }));
    });
  } catch (e) {
    callback(e, $.refs, schemas);
  }
};
