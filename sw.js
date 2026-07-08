// প্রিন্ট ডাক্তার — Service Worker
// শুধু অ্যাপের মূল খোলস (shell) ক্যাশ করে, যাতে সাইটটা দ্রুত লোড হয় এবং
// দুর্বল/বিচ্ছিন্ন নেটওয়ার্কেও অ্যাপটা খোলা যায়। চ্যাট (/api/chat) কখনো ক্যাশ হয় না —
// সবসময় লাইভ ইন্টারনেট থেকে আসল উত্তর আনা হয়।

const CACHE_NAME = "print-doctor-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // চ্যাট API কখনো ক্যাশ থেকে সার্ভ করা হবে না — সবসময় নেটওয়ার্ক থেকেই যাবে।
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // বাকি সবকিছুর জন্য: আগে ক্যাশ, না পেলে নেটওয়ার্ক (এবং নতুন করে ক্যাশ করে রাখা)।
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (
            event.request.method === "GET" &&
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
