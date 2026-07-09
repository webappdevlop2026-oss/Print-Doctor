// প্রিন্ট ডাক্তার — Service Worker
// শুধু অ্যাপের মূল খোলস (shell) ক্যাশ করে, যাতে সাইটটা দ্রুত লোড হয় এবং
// দুর্বল/বিচ্ছিন্ন নেটওয়ার্কেও অ্যাপটা খোলা যায়। চ্যাট (/api/chat) কখনো ক্যাশ হয় না —
// সবসময় লাইভ ইন্টারনেট থেকে আসল উত্তর আনা হয়।
//
// CACHE_NAME বাড়ালে (v1 -> v2 -> ...) পুরোনো ডিভাইসে আটকে থাকা ক্যাশ
// স্বয়ংক্রিয়ভাবে মুছে গিয়ে নতুন ভার্সন লোড হবে। প্রতিবার বড় আপডেট দিলে
// এই ভার্সন নাম্বার বাড়িয়ে দিন।
const CACHE_NAME = "print-doctor-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png"
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

  // পেজ নেভিগেশন (HTML) সবসময় আগে নেটওয়ার্ক থেকে আনার চেষ্টা করে —
  // এতে নতুন ডিপ্লয়ের আপডেট সাথে সাথে দেখা যায়। নেট না থাকলে ক্যাশ থেকে দেখাবে।
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // বাকি স্ট্যাটিক ফাইলের জন্য (আইকন, manifest ইত্যাদি): আগে ক্যাশ, না পেলে নেটওয়ার্ক।
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
