'use strict';

var fs = require('fs'),
    path = require('path'),
    deref = require('deref'),
    Segueta = require('segueta');

var $ = {
  http: require('http'),
  https: require('https')
};

function uri(path) {
  return path.split('#')[0];
}

function isLocal(url, root) {
  if (root && url.indexOf(root) === 0) {
    return true;
  }

  if ((url.indexOf('/') === 0) || (url.indexOf('./') === 0) || (url.indexOf('../') === 0)) {
    return true;
  }

  if (/^[-.\/\w]+(\.\w+)?$/.test(uri(url))) {
    return true;
  }
}

function isRemote(path) {
  if (path && (path.indexOf('http:') > -1) || (path.indexOf('https:') > -1)) {
    return true;
  }
}

function extractRefs(obj) {
  var set = [];

  for (var key in obj) {
    var value = obj[key];

    if (key === '$ref' && (isLocal(value) || isRemote(value))) {
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

  var _ = new Segueta();

  var refs = {},
      schema_directory = params.directory || process.cwd(),
      normalized_fakeroot = typeof params.fakeroot === 'string' && (params.fakeroot.replace(/\/+$/g, '') + '/');

  function downloadSchemas(from, parent) {
    var schema_root = uri(deref.util.resolveUrl(from.$schema, from.id));

    extractRefs(from).forEach(function(url) {
      if (isLocal(url, normalized_fakeroot)) {
        if (url.indexOf(normalized_fakeroot) === 0) {
          parent = schema_directory;
        } else {
          url = deref.util.resolveUrl(normalized_fakeroot, uri(url)).replace(normalized_fakeroot, '');
        }

        var file = path.resolve(parent + '/' + url.replace(normalized_fakeroot, ''));

        if (!refs[url]) {
          var data = JSON.parse(fs.readFileSync(file).toString());

          downloadSchemas(data, path.dirname(file));

          refs[url] = data;
        }
      } else {
        url = uri(deref.util.resolveUrl(schema_root, url));

        if (refs[url]) {
          return;
        }

        _.then(function(next) {
          var req = $[url.split(':')[0]];

          req.get(url, function(res) {
            var body = '';

            res.on('data', function(chunk) {
              body += chunk;
            });

            res.on('end', function() {
              try {
                var data = JSON.parse(body);

                downloadSchemas(data, path.dirname(url));

                refs[url] = data;

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

    schemas.forEach(function(schema) {
      var fixed = deref(schema);

      if (!refs[fixed.id]) {
        refs[fixed.id] = fixed;
      }

      downloadSchemas(fixed, schema_directory);
    });

    _.done(function(err) {
      callback(err, refs);
    });
  } catch (e) {
    callback(e, {});
  }
};
