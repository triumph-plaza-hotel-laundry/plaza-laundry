/* OneSignal Web SDK service worker — scoped to /onesignal/ to coexist with the PWA worker at /. */
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

  self.addEventListener('install', function () {
    trace('install', { ok: true });
  });

  self.addEventListener('activate', function () {
    trace('activate', { ok: true });
  });

  self.addEventListener('push', function (event) {
    var payloadPreview = null;
    var payloadBytes = null;
    try {
      if (event.data) {
        payloadPreview = event.data.text();
        payloadBytes = payloadPreview ? payloadPreview.length : 0;
      }
    } catch (error) {
      payloadPreview = '(unreadable: ' + String(error) + ')';
    }
    trace('push', {
      hasData: Boolean(event.data),
      payloadBytes: payloadBytes,
      payloadPreview: payloadPreview
        ? String(payloadPreview).slice(0, 800)
        : null,
    });
  });

  self.addEventListener('notificationclick', function (event) {
    var n = event.notification;
    var data = (n && n.data) || {};
    var inboxId =
      (typeof data.inbox_id === 'string' && data.inbox_id) ||
      (data.additionalData &&
        typeof data.additionalData.inbox_id === 'string' &&
        data.additionalData.inbox_id) ||
      null;
    var launchUrl =
      (typeof data.url === 'string' && data.url) ||
      (typeof data.web_url === 'string' && data.web_url) ||
      (typeof data.launchURL === 'string' && data.launchURL) ||
      null;

    trace('notificationclick', {
      action: event.action || null,
      title: n && n.title ? n.title : null,
      body: n && n.body ? String(n.body).slice(0, 200) : null,
      tag: n && n.tag ? n.tag : null,
      inboxId: inboxId,
      launchUrl: launchUrl,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
    });

    // Deep-link backup: focus an open app window and tell it which inbox row
    // to open. OneSignal navigate + web_url is primary; this covers focus-only
    // paths and already-open clients without dumping the user on home.
    if (!inboxId && !launchUrl) {
      return;
    }

    var origin = self.location.origin;
    var targetPath = inboxId
      ? '/?openNotification=' + encodeURIComponent(inboxId)
      : null;
    var absoluteUrl = launchUrl || (targetPath ? origin + targetPath : origin + '/');

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          for (var i = 0; i < clientList.length; i += 1) {
            var client = clientList[i];
            try {
              if (client.url && client.url.indexOf(origin) === 0) {
                client.postMessage({
                  type: 'tpl-open-notification',
                  inboxId: inboxId,
                  url: absoluteUrl,
                });
                if (typeof client.focus === 'function') {
                  return client.focus();
                }
                return undefined;
              }
            } catch (_e) {
              /* try next */
            }
          }
          // Cold start: OneSignal's navigate + web_url opens the deep link.
          return undefined;
        })
        .catch(function (error) {
          trace('notificationclick-navigate-failed', {
            message: String(error),
          });
        }),
    );
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

  trace('boot', { note: 'push-trace listeners armed before OneSignal SDK import' });
})();

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
