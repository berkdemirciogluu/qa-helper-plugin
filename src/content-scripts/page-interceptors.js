/**
 * QA Helper — MAIN world page interceptors.
 *
 * Bu script manifest'te world: "MAIN" olarak kayıtlıdır ve CSP'yi bypass eder.
 * XHR, Fetch, Console ve History API'lerini monkey-patch ederek
 * content script'e (ISOLATED world) postMessage ile event gönderir.
 */
(function () {
  var QA_XHR = '__QA_HELPER_XHR__';
  var QA_CONSOLE = '__QA_HELPER_CONSOLE__';
  var QA_NAV = '__QA_HELPER_NAV__';
  var MAX_BODY = 51200; // 50 * 1024

  // ── Static asset filter ──
  var STATIC_EXT = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.ico',
    '.map',
    '.webp',
    '.avif',
  ];

  function isStaticAsset(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return true;
    try {
      var pathname = new URL(url, location.href).pathname.toLowerCase();
      for (var i = 0; i < STATIC_EXT.length; i++) {
        if (pathname.endsWith(STATIC_EXT[i])) return true;
      }
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  // ── Body truncation ──
  function truncateBody(body) {
    if (!body) return undefined;
    if (typeof body !== 'string') return undefined;
    if (body.length > MAX_BODY) return body.slice(0, MAX_BODY) + '\n[truncated at 50KB]';
    return body;
  }

  // ── XHR Monkey-Patch ──
  var _xhrMeta = new WeakMap();
  var _origOpen = XMLHttpRequest.prototype.open;
  var _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    _xhrMeta.set(this, { method: method, url: String(url), startTime: Date.now() });
    return _origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    var meta = _xhrMeta.get(this);
    if (meta && !isStaticAsset(meta.url)) {
      meta.requestBody = typeof body === 'string' ? body : null;
      var xhr = this;
      xhr.addEventListener('loadend', function () {
        var duration = Date.now() - meta.startTime;
        var resBody = null;
        try {
          var rt = xhr.responseType;
          if (!rt || rt === 'text' || rt === '' || rt === 'json') {
            resBody = rt === 'json' ? JSON.stringify(xhr.response) : xhr.responseText;
          }
        } catch (_e) {
          /* blob/arraybuffer/document — atla */
        }
        window.postMessage(
          {
            type: QA_XHR,
            method: meta.method,
            url: meta.url,
            status: xhr.status,
            duration: duration,
            requestBody: truncateBody(meta.requestBody),
            responseBody: truncateBody(resBody),
            timestamp: meta.startTime,
          },
          '*'
        );
      });
    }
    return _origSend.apply(this, arguments);
  };

  // ── Fetch Monkey-Patch ──
  var _origFetch = window.fetch;
  window.fetch = function (input, init) {
    var startTime = Date.now();
    var method = (init && init.method) || 'GET';
    var url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (isStaticAsset(url)) {
      return _origFetch.apply(this, arguments);
    }

    return _origFetch
      .apply(this, arguments)
      .then(function (response) {
        var duration = Date.now() - startTime;
        var cloned = response.clone();
        cloned
          .text()
          .then(function (body) {
            window.postMessage(
              {
                type: QA_XHR,
                method: method,
                url: url,
                status: response.status,
                duration: duration,
                requestBody: truncateBody(init && typeof init.body === 'string' ? init.body : null),
                responseBody: truncateBody(body),
                timestamp: startTime,
              },
              '*'
            );
          })
          .catch(function () {
            /* ignore */
          });
        return response;
      })
      .catch(function (err) {
        window.postMessage(
          {
            type: QA_XHR,
            method: method,
            url: url,
            status: 0,
            duration: Date.now() - startTime,
            requestBody: null,
            responseBody: null,
            timestamp: startTime,
          },
          '*'
        );
        throw err;
      });
  };

  // ── Console Interception ──
  var _origConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
  };

  ['log', 'warn', 'error', 'info'].forEach(function (level) {
    console[level] = function () {
      _origConsole[level].apply(console, arguments);
      try {
        var args = Array.prototype.slice.call(arguments);
        var msg = args
          .map(function (a) {
            try {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            } catch (e) {
              return String(a);
            }
          })
          .join(' ');
        var stack = level === 'error' ? new Error().stack || '' : undefined;
        window.postMessage(
          {
            type: QA_CONSOLE,
            level: level,
            message: msg,
            stack: stack,
            timestamp: Date.now(),
          },
          '*'
        );
      } catch (_e) {
        /* silently ignore interception errors */
      }
    };
  });

  // ── History Monkey-Patch ──
  var _origPush = history.pushState;
  var _origReplace = history.replaceState;

  history.pushState = function () {
    var oldUrl = location.href;
    var result = _origPush.apply(this, arguments);
    window.postMessage(
      {
        type: QA_NAV,
        oldUrl: oldUrl,
        newUrl: location.href,
        title: document.title,
        timestamp: Date.now(),
      },
      '*'
    );
    return result;
  };

  history.replaceState = function () {
    var oldUrl = location.href;
    var result = _origReplace.apply(this, arguments);
    window.postMessage(
      {
        type: QA_NAV,
        oldUrl: oldUrl,
        newUrl: location.href,
        title: document.title,
        timestamp: Date.now(),
      },
      '*'
    );
    return result;
  };
})();
