'use strict';

var fs = require('fs'),
    path = require('path'),
    deref = require('deref'),
    Promise = require('es6-promise');

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

function extractRefs(obj, acc) {
  if (typeof obj !== 'object') {
    return acc;
  }

  for (var key in obj) {
    var value = obj[key];

    if (key === '$ref'
      && value.indexOf('#/') !== 0
      && acc.indexOf(value) === -1) {
      acc.push(value);
    }

    if (typeof value === 'object') {
      acc = extractRefs(value, acc);
    }
  }

  return acc;
}

module.exports = function(params) {
  var schemas = params.schemas || (Array.isArray(params.schema) ? params.schema : (params.schema ? [params.schema] : []));

  var $ = deref();

  var schema_directory = params.directory || process.cwd(),
      normalized_fakeroot = typeof params.fakeroot === 'string' && (params.fakeroot.replace(/\/+$/g, '') + '/');

  function addRef(id, data) {
    $.refs[id] = data;

    return getRefs(data, id);
  }

  function getRefs(from, parent) {
    return Promise.all(extractRefs(from, []).map(function(url) {
      var ref_id = $.util.getDocumentURI($.util.resolveURL(parent, url)),
          ref_path = ref_id.replace(normalized_fakeroot, '');

      if (!ref_path || $.refs[ref_id]) {
        return;
      }

      // pending
      $.refs[ref_id] = {};

      if (!$.util.isURL(ref_path)) {
        var schema_file = path.resolve(schema_directory, ref_path);

        return addRef(ref_id, parseJSON(fs.readFileSync(schema_file), schema_file));
      }

      return new Promise(function(ok, fail) {
        var req = fetchFrom[ref_id.split(':')[0]];

        var done;
        var failed;

        req.get(ref_id, function(res) {
          done = true;

          var body = '';

          res.on('data', function(chunk) {
            body += chunk;
          });

          res.on('end', function() {
            try {
              failed || ok(addRef(ref_id, parseJSON(body, ref_id)));
            } catch (e) {
              fail(e);
            }
          });
        }).on('error', function() {
          failed || fail(new Error('cannot reach ' + ref_id));
        });
      });
    }));
  }

  function _done(err) {
    Object.keys($.refs).forEach(function(ref) {
      if (typeof $.refs[ref] === 'object' && !$.refs[ref].$ref) {
        $.refs[ref] = $.util.normalizeSchema(ref, $.refs[ref]);
      }
    });

    if (params.schemas) {
      return { err: err, refs: $.refs, schemas: schemas };
    }

    return { err: err, refs: $.refs, schema: schemas[0] };
  }

  schemas = schemas.map(function(schema) {
    return $.util.normalizeSchema(normalized_fakeroot, schema);
  });

  return Promise.all(schemas.map(function(schema) {
    return getRefs(schema, schema_directory);
  }))
  .then(function() {
    return _done();
  })
  .catch(_done);
};
