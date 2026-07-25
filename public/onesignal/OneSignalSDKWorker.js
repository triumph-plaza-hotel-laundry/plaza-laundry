/* OneSignal Web SDK service worker — scoped to /onesignal/ to coexist with the PWA worker at /. */
/* TEMP push-trace instrumentation — client OS-notification diagnosis only. */
(function installPushTrace() {
  var PREFIX = '[push-trace:sw]';
  var DB_NAME = 'tpl-push-trace';
  var STORE = 'events';

  function persist(entry) {
    try {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { autoIncrement: true });
        }
      };
      req.onsuccess = function () {
        try {
          var db = req.result;
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).add(entry);
        } catch (_e) {
          /* ignore */
        }
      };
    } catch (_e) {
      /* ignore */
    }
  }

  function broadcast(entry) {
    try {
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clients) {
          for (var i = 0; i < clients.length; i += 1) {
            clients[i].postMessage({ type: 'tpl-push-trace', entry: entry });
          }
        })
        .catch(function () {
          /* ignore */
        });
    } catch (_e) {
      /* ignore */
    }
  }

  function trace(stage, detail) {
    var entry = {
      stage: stage,
      detail: detail || null,
      at: new Date().toISOString(),
      swScript: self.location && self.location.href ? self.location.href : null,
      source: 'sw',
    };
    console.log(PREFIX, stage, detail || '');
    persist(entry);
    broadcast(entry);
  }

  /**
   * CRITICAL: never call event.data.text()/json()/arrayBuffer().
   * PushMessageData is single-consume; reading it here can starve OneSignal
   * on some Chromium builds and prevent showNotification entirely.
   */
  function summarizePushEvent(event) {
    return {
      hasData: Boolean(event && event.data),
      dataType: event && event.data ? typeof event.data : null,
      visibilityHint: 'do-not-read-body',
    };
  }

  function summarizeNotificationOptions(title, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var data = opts.data && typeof opts.data === 'object' ? opts.data : null;
    return {
      title: title != null ? String(title).slice(0, 120) : null,
      body:
        opts.body != null ? String(opts.body).slice(0, 200) : null,
      tag: opts.tag != null ? String(opts.tag) : null,
      icon: opts.icon ? true : false,
      badge: opts.badge ? true : false,
      silent: Boolean(opts.silent),
      renotify: Boolean(opts.renotify),
      requireInteraction: Boolean(opts.requireInteraction),
      dataKeys: data ? Object.keys(data).slice(0, 20) : [],
    };
  }

  function patchShowNotification() {
    var proto =
      self.ServiceWorkerRegistration &&
      self.ServiceWorkerRegistration.prototype;
    if (!proto || proto.__tplShowNotificationPatched) {
      return;
    }

    var original = proto.showNotification;
    if (typeof original !== 'function') {
      trace('showNotification-patch-skip', { reason: 'no-original' });
      return;
    }

    proto.showNotification = function patchedShowNotification(title, options) {
      var summary = summarizeNotificationOptions(title, options);
      trace('payload-parsed', summary);
      trace('showNotification-called', summary);

      try {
        var result = original.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          return result.then(
            function (value) {
              trace('showNotification-resolved', summary);
              return value;
            },
            function (error) {
              trace('showNotification-threw', {
                message: error && error.message ? error.message : String(error),
                name: error && error.name ? error.name : null,
                summary: summary,
              });
              throw error;
            },
          );
        }

        trace('showNotification-resolved', {
          sync: true,
          summary: summary,
        });
        return result;
      } catch (error) {
        trace('showNotification-threw', {
          message: error && error.message ? error.message : String(error),
          name: error && error.name ? error.name : null,
          summary: summary,
        });
        throw error;
      }
    };

    proto.__tplShowNotificationPatched = true;
    trace('showNotification-patched', { ok: true });
  }

  patchShowNotification();

  self.addEventListener('install', function () {
    patchShowNotification();
    trace('install', { ok: true });
  });

  self.addEventListener('activate', function () {
    patchShowNotification();
    trace('activate', { ok: true });
  });

  self.addEventListener('push', function (event) {
    // Do NOT read event.data — single-consume on some Chromium devices.
    trace('push-received', summarizePushEvent(event));
  });

  self.addEventListener('notificationclick', function (event) {
    var n = event.notification;
    trace('notificationclick', {
      action: event.action || null,
      title: n && n.title ? n.title : null,
      body: n && n.body ? String(n.body).slice(0, 200) : null,
      tag: n && n.tag ? n.tag : null,
    });
  });

  self.addEventListener('notificationclose', function (event) {
    var n = event.notification;
    trace('notificationclose', {
      title: n && n.title ? n.title : null,
      tag: n && n.tag ? n.tag : null,
    });
  });

  self.addEventListener('pushsubscriptionchange', function () {
    trace('pushsubscriptionchange', { ok: true });
  });

  trace('boot', {
    note: 'push-trace armed; showNotification patched; push body not read',
    version: 2,
  });
})();

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
