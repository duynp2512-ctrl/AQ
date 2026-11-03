/* Tự động tạo bởi build_data.py */
const VERSION="van-ban-tra-cuu-4ac86e7f712f";
const CORE=["./", "./index.html", "./app.js", "./data.js", "./manifest.webmanifest", "./icon.svg", "./van-ban-goc/116_2018_ND-CP_349634.docx", "./van-ban-goc/156_2025_ND-CP_661201.docx", "./van-ban-goc/29_2025_TT-NHNN_675806.docx", "./van-ban-goc/55_2015_ND-CP_277254.docx"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('van-ban-tra-cuu-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(resp=>{if(resp.ok){const copy=resp.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy));}return resp;}).catch(()=>caches.match(event.request)));
});
