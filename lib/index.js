// parseURI() and resolveUrl() are from https://gist.github.com/1088850
//   -  released as public domain by author ("Yaffle") - see comments on gist
//   -  used by tv4, so I think it's OK

function parseURI(url) {
  var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
  // authority = '//' + user + ':' + pass '@' + hostname + ':' port
  return (m ? {
    href     : m[0] || '',
    protocol : m[1] || '',
    authority: m[2] || '',
    host     : m[3] || '',
    hostname : m[4] || '',
    port     : m[5] || '',
    pathname : m[6] || '',
    search   : m[7] || '',
    hash     : m[8] || ''
  } : null);
}

function resolveUrl(base, href) {// RFC 3986

  function removeDotSegments(input) {
    var output = [];
    input.replace(/^(\.\.?(\/|$))+/, '')
      .replace(/\/(\.(\/|$))+/g, '/')
      .replace(/\/\.\.$/, '/../')
      .replace(/\/?[^\/]*/g, function (p) {
        if (p === '/..') {
          output.pop();
        } else {
          output.push(p);
        }
    });
    return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
  }

  href = parseURI(href || '');
  base = parseURI(base || '');

  return !href || !base ? null : (href.protocol || base.protocol) +
    (href.protocol || href.authority ? href.authority : base.authority) +
    removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
    (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
    href.hash;
}

function getDocumentUri(uri) {
  return uri.split('#')[0];
}

var fs = require('fs'),
    path = require('path'),
    Segueta = require('segueta');

var $ = {
  http: require('http'),
  https: require('https')
};

function extractRefs(obj) {
  var set = [];

  for (var key in obj) {
    var value = obj[key];

    if ('$ref' === key) {
      set.push(value);
    }

    if ('object' === typeof value) {
      set = set.concat(extractRefs(value));
    }
  }

  return set;
}

module.exports = function(params, callback) {
  var schema_root = getDocumentUri(params.schema.id ? resolveUrl(params.schema['$schema'], params.schema.id) : params.schema['$schema']),
      schema_directory = params.directory || process.cwd();

  var normalized_fakeroot = 'string' === typeof params.fakeroot && (params.fakeroot.replace(/\/+$/g, '') + '/');

  var _ = new Segueta(),
      refs = {};

  function downloadSchemas(from) {
    extractRefs(from).forEach(function(url) {
      if (normalized_fakeroot && 0 === url.indexOf(normalized_fakeroot)) {
        var file = path.resolve(schema_directory + '/' + url.substr(normalized_fakeroot.length));

        if (!refs[url] && fs.existsSync(file)) {
          var data = JSON.parse(fs.readFileSync(file).toString());

          downloadSchemas(data);

          refs[url] = data;
        }
      } else {
        url = getDocumentUri(resolveUrl(schema_root, url));

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
              var data = JSON.parse(body);

              downloadSchemas(data);

              refs[url] = data;
              next();
            });

          }).on('error', function(err) {
            next('cannot reach ' + url);
          });
        });
      }
    });
  }

  downloadSchemas(params.schema);

  _.done(function(err) {
    callback(err, refs);
  });
};

