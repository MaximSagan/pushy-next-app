self.addEventListener("activate", async () => {
  // This will be called only once when the service worker is activated.
  console.log("service worker activate");
});

self.addEventListener("push", async (pushEvent) => {
  // This will be called only once when the service worker is activated.
  console.log("Received push");

  onPush(pushEvent);
});

function onPush(pushEvent) {
  if (!pushEvent.data) {
    return;
  }

  const json = pushEvent.data.json();
  const handledPromise = handlePush(json);
  // Handle the push and keep the SW alive until it's handled.
  pushEvent.waitUntil(handledPromise);
}

const NOTIFICATION_OPTION_NAMES = [
  "actions",
  "badge",
  "body",
  "data",
  "dir",
  "icon",
  "image",
  "lang",
  "renotify",
  "requireInteraction",
  "silent",
  "tag",
  "timestamp",
  "title",
  "vibrate",
];

async function handlePush(data) {
  await broadcast({
    type: "PUSH",
    data,
  });
  if (!data.notification || !data.notification.title) {
    return;
  }
  const desc = data.notification;
  let options = {};
  NOTIFICATION_OPTION_NAMES.filter((name) => desc.hasOwnProperty(name)).forEach(
    (name) => (options[name] = desc[name])
  );
  await self.registration.showNotification(desc["title"], options);
}

async function broadcast(msg) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(msg);
  });
}
