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

    if (key === '$ref' && (value.indexOf('#/') === -1)) {
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
    extractRefs(from).forEach(function(url) {
      var ref_id = $.util.getDocumentURI(url),
          ref_path = ref_id.replace(normalized_fakeroot, '');

      if ($.refs[ref_id]) {
        return;
      }

      if (!$.util.isURL(ref_path)) {
        var schema_file = path.resolve(parent, ref_path);

        $.refs[ref_id] = parseJSON(fs.readFileSync(schema_file), schema_file);
      } else {
        _.then(function(next) {
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
        });
      }
    });
  }

  try {
    if (!Array.isArray(schemas)) {
      throw new Error('Invalid schemas "' + JSON.stringify(schemas) + '" (array expected)');
    }

    schemas.forEach(function(schema) {
      getRefs($.util.normalizeSchema(normalized_fakeroot, schema), schema_directory);
    });

    _.run(function(err) {
      for (var ref in $.refs) {
        var fixed_ref = ref.replace(normalized_fakeroot, '');

        if (!$.refs[fixed_ref]) {
          $.refs[fixed_ref] = { $ref: ref };
        }
      }

      callback(err, $.refs);
    });
  } catch (e) {
    callback(e, $.refs);
  }
};
