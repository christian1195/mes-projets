const C='mesprojets-v68',SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','logo-larocq.svg','next.js','bd.js','vendor/jszip.min.js','covers/a-city-of-me.jpg','covers/ca-s-est-passe-ici-outaouais.jpg','covers/ce-qu-il-en-reste-la-joconde.jpg','covers/dancingly-yours.jpg','covers/le-dernier-costco.jpg','covers/le-dernier-lait.jpg','covers/les-monstres-qu-on-s-invente.jpg','covers/missing-time-at-road-44.jpg','covers/quarante-cinq-minutes.jpg','covers/second-notice.jpg','covers/story-bible-for-claude.jpg','covers/the-4th-hour-series-overview.jpg','covers/the-4th-hour-the-skull.jpg','covers/the-lines-that-live.jpg','covers/the-seventh-round.jpg','covers/wait-ai-immobilier.jpg','covers/wait-ai-enseignants.jpg','covers/mountain-of-the-gods.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&!x.startsWith('larocq-audio')).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(e.request.method==='GET'&&u.pathname.includes('/releases/download/')){e.respondWith(caches.open('larocq-audio-v1').then(c=>c.match(u.href)).then(m=>m||fetch(e.request)));return}
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(u.pathname.endsWith('notes.json')){e.respondWith(fetch(e.request,{cache:'no-store'}));return}
 if(u.pathname.endsWith('projects.json')){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put('projects.json',cp));return r}).catch(()=>caches.match('projects.json')));return}
 if(e.request.cache==='no-store'&&u.pathname.endsWith('.epub'))return;
 if(/\/(livres|vendor)\//.test(u.pathname)){e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r})));return}
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data&&e.data.text()}}
 e.waitUntil(self.registration.showNotification(d.title||'Larocq',{body:d.body||'',icon:d.icon||'icon-192.png',badge:'icon-192.png',image:d.image,tag:d.tag,renotify:!!d.tag,data:{url:d.url||'#/'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const h=(e.notification.data&&e.notification.data.url)||'#/',base=self.registration.scope;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{const w=L.find(c=>c.url.startsWith(base));if(w){w.postMessage({t:'nav',url:h});return w.focus()}return clients.openWindow(base+(h[0]=='#'?h:''))}))});
self.addEventListener('message',e=>{if(e.data&&e.data.t==='skip')self.skipWaiting()});
