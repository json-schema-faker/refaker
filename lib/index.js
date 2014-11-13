'use strict';

var fs = require('fs'),
    path = require('path'),
    deref = require('deref'),
    Async = require('async-parts');

var fetchURL = {
  http: require('http'),
  https: require('https')
};

function isLocal(url, root) {
  if (root && url.indexOf(root) === 0) {
    return true;
  }

  if ((url.indexOf('/') === 0) || (url.indexOf('./') === 0) || (url.indexOf('../') === 0)) {
    return true;
  }

  if (/^[-.\/\w]+(\.\w+)?$/.test(deref.util.getDocumentURI(url))) {
    return true;
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

  function pushReference(from, url) {
    var fixed = deref.util.normalizeSchema(normalized_fakeroot, from);

    var fixed_url = deref.util.resolveURL(fixed.$schema, url),
        fixed_id = deref.util.getDocumentURI(fixed_url);

    if (!$.refs[fixed_id]) {
      $.refs[fixed_id] = fixed;
    }
  }

  function downloadSchemas(from) {
    extractRefs(from).forEach(function(url) {
      var base = deref.util.getDocumentURI(deref.util.resolveURL(normalized_fakeroot, url));

      if ($.refs[base]) {
        return;
      }

      if (isLocal(base, normalized_fakeroot)) {
        base = base.replace(normalized_fakeroot, '');

        var file = path.join(schema_directory, base);

        if (base.indexOf(schema_directory) === -1) {
          // TODO: im not sure about any strategy here...
          file = path.join(schema_directory, path.basename(base));
        }

        if (!fs.existsSync(file)) {
          file = path.resolve(schema_directory + '/' + base);
        }

        var data = JSON.parse(fs.readFileSync(file).toString());

        pushReference(data, url);
        downloadSchemas(data);
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
                var data = JSON.parse(body);

                pushReference(data, url);
                downloadSchemas(data);

                next();
              } catch (e) {
                next(new Error('unable to JSON.parse from ' + url));
              }
            });

          }).on('error', function() {
            next(new Error('cannot reach ' + url));
          });
        });
      }
    });
  }

  try {
    if (!Array.isArray(schemas)) {
      throw new Error('Invalid schemas "' + JSON.stringify(schemas) + '" (array expected)');
    }

    schemas.forEach(function(data) {
      pushReference(data, data.id);
      downloadSchemas(data);
    });

    _.run(function(err) {
      callback(err, $.refs, schemas.map(function(schema) {
        return deref.util.normalizeSchema(normalized_fakeroot, schema);
      }));
    });
  } catch (e) {
    callback(e, $.refs, schemas);
  }
};
