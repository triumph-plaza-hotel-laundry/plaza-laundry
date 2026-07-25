/* Legacy updater worker (same v16 import; kept for older browser registrations). */
/* TEMP push-trace instrumentation — remove after delivery diagnosis. */
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
    };
    console.log(PREFIX, stage, detail || '');
    persist(entry);
    broadcast(entry);
  }

  self.addEventListener('push', function (event) {
    var payloadPreview = null;
    try {
      payloadPreview = event.data ? event.data.text() : null;
    } catch (error) {
      payloadPreview = '(unreadable: ' + String(error) + ')';
    }
    trace('push', {
      hasData: Boolean(event.data),
      payloadPreview: payloadPreview
        ? String(payloadPreview).slice(0, 800)
        : null,
    });
  });

  self.addEventListener('notificationclick', function (event) {
    var n = event.notification;
    trace('notificationclick', {
      action: event.action || null,
      title: n && n.title ? n.title : null,
    });
  });

  trace('boot', { note: 'updater worker push-trace armed' });
})();

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
