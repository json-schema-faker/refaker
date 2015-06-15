'use strict';

var fs = require('fs'),
    path = require('path'),
    deref = require('deref'),
    Async = require('async-parts');

var fetchFrom = {
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

    if (key === '$ref' && (value.charAt() !== '#')) {
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

  var $ = deref(),
      _ = new Async();

  var schema_directory = params.directory || process.cwd(),
      normalized_fakeroot = typeof params.fakeroot === 'string' && (params.fakeroot.replace(/\/+$/g, '') + '/');

  function getRefs(from, parent) {
    return function(next) {
      var refs = extractRefs(from);

      if (!refs.length) {
        next();
      }

      refs.forEach(function(url) {
        var ref_path = url.replace(normalized_fakeroot, ''),
            ref_id = $.util.getDocumentURI(url).replace(/\.\//, '');

        if (!$.util.isURL(ref_path)) {
          var schema_file = path.resolve(parent, ref_path);

          $.refs[ref_id] = parseJSON(fs.readFileSync(schema_file), schema_file);

          next();
        } else {
          var req = fetchFrom[url.split(':')[0]];

          req.get(url, function(res) {
            var body = '';

            res.on('data', function(chunk) {
              body += chunk;
            });

            res.on('end', function() {
              $.refs[ref_id] = parseJSON(body, url);

              next();
            });
          }).on('error', function() {
            next(new Error('cannot reach ' + url));
          });
        }
      });
    };
  }

  try {
    if (!Array.isArray(schemas)) {
      throw new Error('Invalid schemas "' + JSON.stringify(schemas) + '" (array expected)');
    }

    schemas.forEach(function(schema) {
      _.then(getRefs(schema, schema_directory));
    });

    _.run(function(err) {
      callback(err, $.refs);
    });
  } catch (e) {
    callback(e, $.refs);
  }
};
