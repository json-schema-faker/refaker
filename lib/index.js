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
  var schemas = params.schemas || (Array.isArray(params.schema) ? params.schema : (params.schema ? [params.schema] : []));

  var $ = deref(),
      _ = new Async();

  var schema_directory = params.directory || process.cwd(),
      normalized_fakeroot = typeof params.fakeroot === 'string' && (params.fakeroot.replace(/\/+$/g, '') + '/');

  function getRefs(from, parent) {
    function addRef(id, data) {
      $.refs[id] = data;
      getRefs(data, id);
    }

    extractRefs(from).forEach(function(url) {
      var ref_id = $.util.getDocumentURI($.util.resolveURL(parent, url)),
          ref_path = ref_id.replace(normalized_fakeroot, '');

      if ($.refs[ref_id]) {
        return;
      }

      if (!$.util.isURL(ref_path)) {
        var schema_file = path.resolve(schema_directory, ref_path);

        addRef(ref_id, parseJSON(fs.readFileSync(schema_file), schema_file));
      } else {
        _.then(function(next) {
          var req = fetchFrom[ref_id.split(':')[0]];

          req.get(ref_id, function(res) {
            var body = '';

            res.on('data', function(chunk) {
              body += chunk;
            });

            res.on('end', function() {
              try {
                addRef(ref_id, parseJSON(body, ref_id));
                next();
              } catch (e) {
                next(e);
              }
            });
          }).on('error', function() {
            next(new Error('cannot reach ' + ref_id));
          });
        });
      }
    });
  }

  try {
    schemas.forEach(function(schema) {
      getRefs($.util.normalizeSchema(normalized_fakeroot, schema), schema_directory);
    });
  } catch (e) {
    callback(e, $.refs);
  }

  _.run(function(err) {
    for (var ref in $.refs) {
      var fixed_ref = ref.replace(normalized_fakeroot, '');

      if (!$.refs[fixed_ref]) {
        $.refs['/' + fixed_ref] = { $ref: ref };
        $.refs[fixed_ref] = { $ref: ref };
      }
    }

    if (params.schemas) {
      callback(err, $.refs, schemas);
    } else {
      callback(err, $.refs, schemas[0]);
    }
  });
};
