/* Larocq — next level (notifications, hors ligne, recherche/Ma liste, aperçus, tableau de bord) */
const LX={};
LX.ic=(d,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
LX.I={bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
dl:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
grid:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'};
/* generic GitHub-API JSON write (same path as notes.json) */
LX.ghFile=async(path,mut,msg)=>{for(let k=0;k<2;k++){let sha,data={};const r=await fetch(GH+'/contents/'+path+'?ref=main&t='+Date.now(),{headers:ghH(),cache:'no-store'});if(r.ok){const j=await r.json();sha=j.sha;data=JSON.parse(b64d(j.content))}else if(r.status!==404)throw new Error('GET '+r.status);mut(data);const w=await fetch(GH+'/contents/'+path,{method:'PUT',headers:{...ghH(),'Content-Type':'application/json'},body:JSON.stringify({message:msg,content:b64e(JSON.stringify(data,null,1)+'\n'),...(sha?{sha}:{}),branch:'main'})});if(w.ok)return data;if(w.status!==409||k)throw new Error('PUT '+w.status)}};

/* ===== 1. Notifications (Web Push, VAPID) ===== */
LX.VAPID='BNC-dK-gJ_vtrIRXJaFAhBAH7-E78om7TCoUcGlP-mOzGlQKvQvReBGZ6gqgkd4uA3lQvVNsQgDYoz0mW801FBE';
LX.PUSHK='mp_push';
LX.u8=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
LX.pushOK=()=>'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
LX.dev=()=>{const u=navigator.userAgent;return /Tablet|SM-X|SM-T|iPad/.test(u)||(/Android/.test(u)&&!/Mobile/.test(u))?'Tablette':/Android|iPhone/.test(u)?'Cellulaire':'Ordinateur'};
LX.pushState=()=>{try{return JSON.parse(localStorage.getItem(LX.PUSHK))||null}catch(_){return null}};
LX.pushOn=async()=>{if(!LX.pushOK()){toast('Notifications pas supportées ici');return}
 if(!tok()){toast('Ajoute ta clé GitHub plus bas d’abord');return}
 const perm=await Notification.requestPermission();if(perm!=='granted'){toast('Permission refusée dans Chrome');LX.setUI();return}
 try{const reg=await navigator.serviceWorker.ready;let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:LX.u8(LX.VAPID)});
  const j=s.toJSON(),id=(LX.pushState()||{}).id||Math.random().toString(36).slice(2,10);
  await LX.ghFile('subs.json',d=>{d.subs=(d.subs||[]).filter(x=>x.id!==id&&x.endpoint!==j.endpoint);d.subs.push({id,appareil:LX.dev(),date:new Date().toISOString().slice(0,16),endpoint:j.endpoint,keys:j.keys})},'Notifications : abonnement '+LX.dev());
  localStorage.setItem(LX.PUSHK,JSON.stringify({id,on:1}));toast('Notifications activées');reg.showNotification('Larocq',{body:'Les notifications sont activées sur ce '+LX.dev().toLowerCase()+'.',icon:'icon-192.png',badge:'icon-192.png',tag:'larocq-test'})}
 catch(x){toast('Erreur : '+x.message)}LX.setUI()};
LX.pushOff=async()=>{const st=LX.pushState();try{const reg=await navigator.serviceWorker.ready,s=await reg.pushManager.getSubscription();if(s)await s.unsubscribe();if(st&&tok())await LX.ghFile('subs.json',d=>{d.subs=(d.subs||[]).filter(x=>x.id!==st.id)},'Notifications : désabonnement')}catch(x){toast('Erreur : '+x.message)}localStorage.removeItem(LX.PUSHK);toast('Notifications désactivées');LX.setUI()};
LX.pushTest=async()=>{const reg=await navigator.serviceWorker.ready;reg.showNotification('Larocq · test',{body:'Voilà de quoi ça a l’air.',icon:'icon-192.png',badge:'icon-192.png',data:{url:'#/'}})};
LX.setUI=()=>{const b=document.getElementById('lxpush');if(!b)return;const st=LX.pushState(),perm=('Notification'in window)?Notification.permission:'n/a',on=st&&st.on&&perm==='granted';
 b.innerHTML=`<b>${LX.ic(LX.I.bell,16)} Notifications</b>Réal t’avertit quand il ajoute un item, quand il a besoin de ta décision, pis pour les buts du Canadien.${!LX.pushOK()?'<p class="muted">Pas supporté sur cet appareil.</p>':perm==='denied'?'<p class="muted">Bloquées dans Chrome : ⋮ › Paramètres du site › Notifications.</p>':''}
 <div class="na"><button class="snd tap" id="lxpt" onclick="${on?'LX.pushOff()':'LX.pushOn()'}">${on?'Désactiver les notifications':'Activer les notifications'}</button>${on?'<button class="tap" onclick="LX.pushTest()">Tester ici</button>':''}</div><small class="muted">${on?'✓ Activées sur ce '+LX.dev().toLowerCase():'Désactivées sur cet appareil'}</small>`};
LX._settings=_settings;_settings=function(){LX._settings();const f=sheet.querySelector('.kv.set');if(f){const d=document.createElement('div');d.className='kv glass set';d.id='lxpush';f.before(d);LX.setUI()}};
/* open deep link from a notification click */
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',m=>{if(m.data&&m.data.t=='nav'&&m.data.url)nav(m.data.url)});

/* ===== 2. Hors ligne : télécharger un livre audio (Cache Storage, réponses opaques) ===== */
LX.AC='larocq-audio-v1';LX.DLK=id=>'mp_dl_'+id;LX.busy={};
LX.dlInfo=id=>{try{return JSON.parse(localStorage.getItem(LX.DLK(id)))||null}catch(_){return null}};
LX.dlCount=async p=>{const c=await caches.open(LX.AC);let n=0;for(const a of p.audio)if(await c.match(a.url))n++;return n};
LX.dl=async id=>{const p=P.find(x=>x.id==id);if(!p||LX.busy[id])return;LX.busy[id]=1;try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
 const c=await caches.open(LX.AC),n=p.audio.length;let k=0;for(const a of p.audio){if(!await c.match(a.url)){LX.dlUI(id,k,n);const r=await fetch(a.url,{mode:'no-cors',cache:'no-store'});await c.put(a.url,r)}k++;LX.dlUI(id,k,n)}
 localStorage.setItem(LX.DLK(id),JSON.stringify({n,at:Date.now()}));toast('Téléchargé : '+p.titre)}catch(x){toast('Téléchargement interrompu : '+(x.name=='QuotaExceededError'?'plus d’espace':x.message))}delete LX.busy[id];LX.dlUI(id)};
LX.dlDel=async id=>{const p=P.find(x=>x.id==id);if(!p)return;const c=await caches.open(LX.AC);for(const a of p.audio)await c.delete(a.url);localStorage.removeItem(LX.DLK(id));toast('Téléchargement supprimé');LX.dlUI(id)};
LX.dlUI=async(id,k,n)=>{const b=document.getElementById('lxdl');if(!b||+b.dataset.id!==id)return;const p=P.find(x=>x.id==id);
 if(k!=null&&LX.busy[id]){b.innerHTML=`<div class="lxdlb"><span>${LX.ic(LX.I.dl,16)} Téléchargement… ${k}/${n} chapitre${n>1?'s':''}</span><div class="bar"><i style="width:${Math.round(k/n*100)}%"></i></div></div>`;return}
 const have=await LX.dlCount(p),N=p.audio.length;
 b.innerHTML=have>=N?`<div class="lxdlb ok"><span>✓ Disponible hors ligne · ${N} chapitre${N>1?'s':''}</span><button class="tap lxdx" onclick="LX.dlDel(${id})">${LX.ic(LX.I.trash,15)} Supprimer</button></div>`
 :`<button class="btn big tap" onclick="LX.dl(${id})">${LX.ic(LX.I.dl,18)} Télécharger pour hors ligne<small>${have?have+'/'+N+' déjà là · ':''}${N} chapitre${N>1?'s':''} · écoute sans réseau</small></button>`;
 document.querySelectorAll('.ch').forEach(async(el,i)=>{const c=await caches.open(LX.AC);el.classList.toggle('lxoff',!!await c.match(p.audio[i].url))})};
LX._play=_play;_play=function(id){const r=LX._play(id);if(r){const n=sheet.querySelector('#pnb');if(n&&'caches'in window){const d=document.createElement('div');d.id='lxdl';d.dataset.id=id;d.style.marginTop='10px';n.after(d);LX.dlUI(id)}}return r};
LX.css=s=>{const t=document.createElement('style');t.textContent=s;document.head.appendChild(t)};
LX.css(`.lxdlb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;border:1px solid var(--gb);background:rgba(128,128,128,.08);font-size:14px;font-weight:650}.lxdlb span{display:flex;align-items:center;gap:6px}.lxdlb .bar{flex-basis:100%;margin:2px 0 0;height:5px}.lxdlb .bar i{background:#e50914;transition:width .3s}.lxdlb.ok{color:#2fbf71}.lxdx{margin-left:auto;display:flex;align-items:center;gap:5px;border:1px solid var(--gb);border-radius:10px;padding:6px 10px;background:none;color:var(--tx);font:inherit;font-size:13px}.ch.lxoff::after{content:' ⤓';color:#2fbf71;font-weight:800}`);

/* ===== 3. Recherche + Ma liste ===== */
LX.MLK='mp_maliste';LX.ml=()=>{try{return JSON.parse(localStorage.getItem(LX.MLK))||[]}catch(_){return[]}};
LX.keyOf=l=>{let m;l=String(l||'');if(m=l.match(/^projet:(\d+)/)||l.match(/^#\/(?:ecouter|lire|projet)\/(\d+)/))return'p:'+m[1];if(m=l.match(/^#\/montre\/([\w-]+)/))return'm:'+m[1];return null};
LX.item=k=>{const[t,id]=[k.slice(0,1),k.slice(2)];if(t=='p'){const p=P.find(x=>x.id==+id);return p&&{k,titre:p.titre,texte:p.prochaine_etape||'',image:p.couverture,lien:AF(p)?'#/ecouter/'+p.id:'projet:'+p.id,type:AF(p)?'Livre audio':p.categorie}}const x=M.find(y=>y.id==id);return x&&{k,titre:x.titre,texte:x.resume||'',image:x.image,lien:'#/montre/'+x.id,type:/pitch/i.test(x.id+x.titre)?'Pitch':'Réal te montre'}};
LX.inL=k=>LX.ml().includes(k);
LX.tog=(k,ev)=>{if(ev){ev.stopPropagation();ev.preventDefault()}let L=LX.ml();const on=!L.includes(k);L=on?[k,...L]:L.filter(x=>x!==k);localStorage.setItem(LX.MLK,JSON.stringify(L));toast(on?'Ajouté à Ma liste':'Retiré de Ma liste');document.querySelectorAll(`.lxh[data-k="${k}"]`).forEach(h=>h.classList.toggle('on',on));if(tab=='home'&&!Q&&!isSheetH(location.hash))draw();if(document.getElementById('lxs').classList.contains('on'))LX.sRun()};
LX.hb=(k,cls='')=>k?`<span role="button" tabindex="0" aria-label="Ma liste" class="lxh tap ${cls} ${LX.inL(k)?'on':''}" data-k="${k}" onclick="LX.tog('${k}',event)">${LX.ic(LX.I.heart,16)}</span>`:'';
LX.deco=()=>{document.querySelectorAll('#app .bk[onclick^="show("]').forEach(b=>{if(b.querySelector('.lxh'))return;const id=(b.getAttribute('onclick').match(/\d+/)||[])[0],c=b.querySelector('.cov');c&&c.insertAdjacentHTML('beforeend',LX.hb('p:'+id,'ov'))});
 document.querySelectorAll('#app .ac-c').forEach(b=>{if(b.querySelector('.lxh'))return;const m=(b.getAttribute('onclick')||'').match(/aGo\("([^"]*)"\)/),k=m&&LX.keyOf(m[1]);const im=b.querySelector('.im');k&&im&&im.insertAdjacentHTML('beforeend',LX.hb(k,'ov'))});
 document.querySelectorAll('#app .mc').forEach(b=>{if(b.querySelector('.lxh'))return;const m=(b.getAttribute('onclick')||'').match(/#\/montre\/([\w-]+)/);const th=b.querySelector('.th');m&&th&&th.insertAdjacentHTML('beforeend',LX.hb('m:'+m[1],'ov'))})};
LX._draw=draw;draw=function(){LX._draw();try{LX.deco()}catch(_){}};
LX._accueil=accueil;accueil=function(v){let h=LX._accueil(v);const L=LX.ml().map(LX.item).filter(Boolean);
 h=h.replace('<img class="ac-logo"',`<button class="lxsb tap" onclick="LX.sOpen()" aria-label="Chercher">${LX.ic(LX.I.search,20)}</button>${LX.dbBtn||''}<img class="ac-logo"`);
 if(L.length){const row=aRow('❤️ Ma liste',L,'❤️'),i=h.indexOf('<div class="ac-t');h=i<0?h.replace(/<\/div>$/,row+'</div>'):h.slice(0,i)+row+h.slice(i)}return h};
LX._show=_show;_show=function(id){LX._show(id);const t=sheet.querySelector('h3');t&&t.insertAdjacentHTML('afterend',LX.hb('p:'+id,'big'))};
LX._openM=openM;openM=function(id){LX._openM(id);const mb=document.querySelector('#mv .mb');if(!mb)return;mb.querySelectorAll('.lxh').forEach(x=>x.remove());mb.insertAdjacentHTML('beforeend',LX.hb('m:'+id,'big'))};
/* overlay */
document.body.insertAdjacentHTML('beforeend',`<div id="lxs" role="dialog" aria-label="Recherche"><div class="lxst"><span class="lxsi">${LX.ic(LX.I.search,18)}</span><input id="lxq" type="search" placeholder="Livres, audio, pitchs, projets…" autocomplete="off" enterkeyhint="search"><button class="tap lxsx" onclick="LX.sClose()" aria-label="Fermer">${LX.ic(LX.I.x,20)}</button></div><div id="lxr"></div></div>`);
LX.norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
LX.sOpen=()=>{lxs.classList.add('on');document.body.classList.add('lxs-on');if(location.hash!=='#/chercher')history.pushState({app:1},'','#/chercher');LX.sRun();setTimeout(()=>lxq.focus(),60)};
LX.sClose=()=>{if(location.hash=='#/chercher')history.back();else{lxs.classList.remove('on');document.body.classList.remove('lxs-on')}};
LX.sGo=l=>{lxs.classList.remove('on');document.body.classList.remove('lxs-on');history.replaceState({app:1},'','#/');aGo(l)};
LX.sRun=()=>{const q=LX.norm(lxq.value.trim()),all=[...P.filter(p=>!p.archive).map(p=>LX.item('p:'+p.id)),...M.map(x=>LX.item('m:'+x.id))].filter(Boolean);
 const hay=it=>{const k=it.k;if(k[0]=='p'){const p=P.find(x=>x.id==+k.slice(2));return LX.norm([p.titre,p.categorie,p.statut,p.serie,p.prochaine_etape,(p.audio||[]).map(a=>a.titre).join(' ')].join(' '))}const x=M.find(y=>y.id==k.slice(2));return LX.norm([x.titre,x.resume,x.type].join(' '))};
 const words=q.split(/\s+/).filter(Boolean),res=q?all.filter(it=>{const h=hay(it);return words.every(w=>h.includes(w))}):[];
 const grp=it=>it.type=='Livre audio'?'Livres audio':it.type=='Pitch'||it.type=='Réal te montre'?'Pitchs & Réal te montre':/Livre/.test(it.type)?'Livres':'Projets';
 const row=it=>`<div class="lxri tap" role="button" tabindex="0" onclick='LX.sGo(${JSON.stringify(it.lien)})'><div class="lxrt">${it.image?`<img src="${e(it.image)}" alt="" loading="lazy">`:''}</div><div class="lxrb"><b>${e(it.titre)}</b><small>${e(it.type||'')} · ${e(it.texte)}</small></div>${LX.hb(it.k)}</div>`;
 let h='';if(!q){const L=LX.ml().map(LX.item).filter(Boolean);h=L.length?`<h4>❤️ Ma liste</h4>${L.map(row).join('')}`:`<p class="lxe">Tape un titre, une série, « audio », « pitch »…<br>Touche le ${LX.ic(LX.I.heart,14)} pour ajouter à Ma liste.</p>`}
 else if(!res.length)h=`<p class="lxe">Rien trouvé pour « ${e(lxq.value)} ».</p>`;
 else{const G={};res.forEach(it=>(G[grp(it)]??=[]).push(it));h=['Livres','Livres audio','Pitchs & Réal te montre','Projets'].filter(g=>G[g]).map(g=>`<h4>${g} <span>${G[g].length}</span></h4>${G[g].map(row).join('')}`).join('')}
 lxr.innerHTML=h};
lxq.addEventListener('input',LX.sRun);
addEventListener('popstate',()=>{if(location.hash!=='#/chercher'&&lxs.classList.contains('on')){lxs.classList.remove('on');document.body.classList.remove('lxs-on')}else if(location.hash=='#/chercher'&&!lxs.classList.contains('on'))LX.sOpen()});
{const sb=document.getElementById('sbt');if(sb){sb.setAttribute('onclick','LX.sOpen()');sb.innerHTML=LX.ic(LX.I.search,19)}}
LX.css(`.lxh{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;color:#bbb;flex:none;cursor:pointer}.lxh.on{color:#e50914}.lxh.on svg{fill:#e50914}.lxh.ov{position:absolute;z-index:3;top:6px;right:6px;width:30px;height:30px;background:rgba(0,0,0,.55);color:#fff;backdrop-filter:blur(4px)}.lxh.ov.on{color:#e50914}.lxh.big{width:42px;height:42px;border:1px solid var(--gb);margin:4px 0 8px}.ac-c .im,.mc .th{position:relative}
.lxsb{position:absolute;z-index:3;right:24px;top:calc(18px + var(--sat));width:38px;height:38px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}.lxdb{right:70px}
#lxs{position:fixed;inset:0;z-index:9000;background:#0b0b0d;color:#f2f2f2;display:none;flex-direction:column;padding-top:var(--sat)}#lxs.on{display:flex}body.lxs-on{overflow:hidden}.lxst{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #222}.lxsi{color:#888;display:flex}#lxq{flex:1;background:#1a1a1e;border:1px solid #2c2c32;border-radius:12px;color:#fff;font:inherit;font-size:17px;padding:11px 12px;outline:0}#lxq:focus{border-color:#e50914}.lxsx{background:none;border:0;color:#ccc;display:flex;padding:6px}
#lxr{flex:1;overflow:auto;padding:6px 14px calc(30px + var(--sab))}#lxr h4{margin:16px 2px 8px;font-size:13px;letter-spacing:.4px;text-transform:uppercase;color:#9a9aa2}#lxr h4 span{color:#e50914;margin-left:4px}.lxri{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;cursor:pointer}.lxri:active{background:#1a1a1e}.lxrt{width:46px;height:64px;border-radius:8px;overflow:hidden;background:#222;flex:none}.lxrt img{width:100%;height:100%;object-fit:cover}.lxrb{flex:1;min-width:0}.lxrb b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lxrb small{display:block;color:#9a9aa2;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lxe{color:#9a9aa2;text-align:center;margin-top:40px;line-height:1.6}`);
if(location.hash=='#/chercher')setTimeout(LX.sOpen,300);

/* ===== 4. Aperçus vidéo automatiques (muets) ===== */
LX.PVK='mp_previews';
LX.pvAllowed=()=>{if(localStorage.getItem(LX.PVK)==='0')return false;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;const c=navigator.connection;if(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||'')))return false;return true};
LX.pvSrc=k=>{if(!k||k[0]!=='m')return null;const x=M.find(y=>y.id==k.slice(2));return x&&x.preview||null};
LX.pvStart=(host,src)=>{if(host.querySelector('video.lxpv'))return;const v=document.createElement('video');v.className='lxpv';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.loop=true;v.preload='auto';v.setAttribute('muted','');v.setAttribute('playsinline','');v.src=src;v.addEventListener('playing',()=>v.classList.add('on'),{once:true});host.appendChild(v);v.play().catch(()=>v.remove())};
LX.pvStop=host=>{const v=host.querySelector('video.lxpv');if(v){v.pause();v.remove()}};
LX.pvIO=('IntersectionObserver'in window)?new IntersectionObserver(es=>es.forEach(en=>{const h=en.target;clearTimeout(h._pvT);if(en.isIntersecting&&en.intersectionRatio>=.6&&LX.pvAllowed()&&!isSheetH(location.hash))h._pvT=setTimeout(()=>LX.pvStart(h,h.dataset.pv),1500);else LX.pvStop(h)}),{threshold:[0,.6,1]}):null;
LX.pvBind=()=>{if(!LX.pvAllowed())return;
 document.querySelectorAll('#app .ac-h').forEach(h=>{if(h.dataset.pv)return;const m=(h.getAttribute('onclick')||'').match(/aGo\("([^"]*)"\)/),src=LX.pvSrc(m&&LX.keyOf(m[1]));if(!src)return;h.dataset.pv=src;LX.pvIO&&LX.pvIO.observe(h)});
 document.querySelectorAll('#app .ac-c,#app .mc').forEach(c=>{if(c.dataset.pv)return;const oc=c.getAttribute('onclick')||'',m=oc.match(/aGo\("([^"]*)"\)/)||oc.match(/nav\('(#\/montre\/[\w-]+)'\)/),src=LX.pvSrc(m&&LX.keyOf(m[1]));if(!src)return;c.dataset.pv=src;const host=c.querySelector('.im,.th')||c;
  const on=()=>{clearTimeout(c._pvT);c._pvT=setTimeout(()=>LX.pvStart(host,src),1500)},off=()=>{clearTimeout(c._pvT);LX.pvStop(host)};
  c.addEventListener('pointerenter',x=>{if(x.pointerType!=='touch')on()});c.addEventListener('pointerleave',off);c.addEventListener('focus',on);c.addEventListener('blur',off)})};
LX._draw2=draw;draw=function(){LX._draw2();try{LX.pvBind()}catch(_){}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video.lxpv').forEach(v=>{v.pause();v.remove()})});
LX._settings2=_settings;_settings=function(){LX._settings2();const n=document.getElementById('lxpush');if(!n)return;const d=document.createElement('div');d.className='kv glass set';const on=localStorage.getItem(LX.PVK)!=='0';
 d.innerHTML=`<b>Aperçus vidéo automatiques</b>Les pitchs jouent un court aperçu muet sur l’accueil. Coupés automatiquement en mode Économiseur de données ou Animations réduites.<div class="na"><button class="snd tap" onclick="localStorage.setItem(LX.PVK,'${on?0:1}');_settings();toast('Aperçus ${on?'désactivés':'activés'}')">${on?'Désactiver les aperçus':'Activer les aperçus'}</button></div>`;n.after(d)};
LX.css(`video.lxpv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s;pointer-events:none;z-index:1}video.lxpv.on{opacity:1}.ac-h .ov{z-index:2}`);

/* ===== 5. Tableau de bord des projets ===== */
LX.dbBtn=`<button class="lxsb lxdb tap" onclick="LX.dOpen()" aria-label="Tableau de bord">${LX.ic(LX.I.grid,19)}</button>`;
LX.F='tous';
LX.FL=[['tous','Tous'],['cours','En cours'],['bloque','Bloqué'],['ok','Attend ton OK'],['faire','À faire'],['fini','Terminés']];
LX.waitMe=p=>waiting(p)||/^christian$/i.test((p.bloque_par||'').trim());
LX.fOf=p=>LX.waitMe(p)?'ok':p.statut=='Bloqué'?'bloque':p.statut=='En cours'?'cours':p.statut=='Terminé'?'fini':'faire';
LX.SC={ok:'#ffb020',bloque:'#ff4d5e',cours:'#3d9bff',faire:'#9a9aa2',fini:'#2fbf71'};
document.body.insertAdjacentHTML('beforeend',`<div id="lxd" role="dialog" aria-label="Tableau de bord"><div class="lxst"><b class="lxdt">Tableau de bord</b><button class="tap lxsx" onclick="LX.dClose()" aria-label="Fermer">${LX.ic(LX.I.x,20)}</button></div><div id="lxdb"></div></div>`);
LX.dOpen=()=>{lxd.classList.add('on');document.body.classList.add('lxs-on');if(location.hash!=='#/tableau')history.pushState({app:1},'','#/tableau');LX.dRun()};
LX.dClose=()=>{if(location.hash=='#/tableau')history.back();else{lxd.classList.remove('on');document.body.classList.remove('lxs-on')}};
LX.dF=f=>{LX.F=f;LX.dRun()};
LX.dGo=id=>{lxd.classList.remove('on');document.body.classList.remove('lxs-on');nav('#/projet/'+id)};
LX.dRun=()=>{const v=P.filter(p=>!p.archive),cnt=f=>v.filter(p=>LX.fOf(p)==f).length,L=v.filter(p=>LX.F=='tous'||LX.fOf(p)==LX.F).sort((a,b)=>['ok','bloque','cours','faire','fini'].indexOf(LX.fOf(a))-['ok','bloque','cours','faire','fini'].indexOf(LX.fOf(b))||(b.maj||'').localeCompare(a.maj||''));
 const avg=v.length?Math.round(v.reduce((a,p)=>a+(+p.progression||0),0)/v.length):0;
 lxdb.innerHTML=`<div class="lxk">${[['ok','Attend ton OK'],['bloque','Bloqués'],['cours','En cours'],['fini','Terminés']].map(([f,l])=>`<button class="tap" style="--c:${LX.SC[f]}" onclick="LX.dF('${f}')"><b>${cnt(f)}</b><span>${l}</span></button>`).join('')}</div><div class="lxavg"><span>Avancement moyen</span><div class="lxpb"><i style="width:${avg}%"></i></div><b>${avg} %</b></div>
 <div class="lxf">${LX.FL.map(([f,l])=>`<button class="tap ${LX.F==f?'on':''}" onclick="LX.dF('${f}')">${l}${f=='tous'?'':` <em>${cnt(f)}</em>`}</button>`).join('')}</div>
 ${L.length?L.map(p=>{const f=LX.fOf(p),c=LX.SC[f];return `<div class="lxpc tap" role="button" tabindex="0" style="--c:${c}" onclick="LX.dGo(${p.id})"><div class="lxpt">${p.couverture?`<img src="${e(p.couverture)}" alt="" loading="lazy">`:''}</div><div class="lxpbd"><div class="lxph"><span class="lxst2">${e(f=='ok'?'Attend ton OK':p.statut)}</span><small>${e(p.categorie||'')} · MAJ ${e(p.maj||'')}</small></div><b>${e(p.titre)}</b><div class="lxrow"><span>Prochaine étape</span>${e(p.prochaine_etape||'—')}</div>${p.bloque_par&&f!='fini'?`<div class="lxrow"><span>${f=='ok'?'Ta décision':'Bloqué par'}</span>${e(p.bloque_par)}</div>`:''}<div class="lxpb sm"><i style="width:${+p.progression||0}%"></i></div></div><b class="lxpp">${+p.progression||0}%</b></div>`}).join(''):`<p class="lxe">Rien dans « ${e(LX.FL.find(x=>x[0]==LX.F)[1])} ».</p>`}`};
addEventListener('popstate',()=>{if(location.hash=='#/tableau'){if(!lxd.classList.contains('on'))LX.dOpen()}else if(lxd.classList.contains('on')){lxd.classList.remove('on');document.body.classList.remove('lxs-on')}});
if(location.hash=='#/tableau')setTimeout(LX.dOpen,600);
{const sb=document.getElementById('sbt');if(sb)sb.insertAdjacentHTML('afterend',`<button class="ib tap" onclick="LX.dOpen()" aria-label="Tableau de bord">${LX.ic(LX.I.grid,18)}</button>`)}
LX.css(`#lxd{position:fixed;inset:0;z-index:9000;background:#0b0b0d;color:#f2f2f2;display:none;flex-direction:column;padding-top:var(--sat)}#lxd.on{display:flex}.lxdt{flex:1;font-size:20px}#lxdb{flex:1;overflow:auto;padding:10px 14px calc(30px + var(--sab))}
.lxk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.lxk button{background:#16161a;border:1px solid #26262c;border-radius:14px;padding:10px 4px;color:#fff;font:inherit;border-top:3px solid var(--c)}.lxk b{display:block;font-size:24px;color:var(--c)}.lxk span{font-size:11px;color:#a8a8b0}
.lxavg{display:flex;align-items:center;gap:10px;margin:14px 2px;font-size:13px;color:#a8a8b0}.lxavg b{color:#fff}.lxpb{flex:1;height:6px;border-radius:6px;background:#26262c;overflow:hidden}.lxpb i{display:block;height:100%;background:#e50914}.lxpb.sm{height:4px;margin-top:8px}.lxpc .lxpb i{background:var(--c)}
.lxf{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}.lxf button{flex:none;border:1px solid #2c2c32;background:#141417;color:#ddd;border-radius:999px;padding:8px 13px;font:inherit;font-size:13.5px;font-weight:650}.lxf button.on{background:#e50914;border-color:#e50914;color:#fff}.lxf em{font-style:normal;opacity:.75;margin-left:2px}
.lxpc{display:flex;gap:12px;align-items:flex-start;padding:12px;margin-bottom:10px;border-radius:14px;background:#141417;border:1px solid #232328;border-left:4px solid var(--c);cursor:pointer}.lxpt{width:52px;height:74px;border-radius:8px;overflow:hidden;background:#222;flex:none}.lxpt img{width:100%;height:100%;object-fit:cover}.lxpbd{flex:1;min-width:0}.lxpbd>b{display:block;font-size:15.5px;margin:3px 0 4px}.lxph{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lxst2{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--c)}.lxph small{color:#80808a;font-size:11.5px}.lxrow{font-size:13px;color:#d0d0d6;margin-top:3px;line-height:1.35}.lxrow span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#80808a;font-weight:700}.lxpp{font-size:13px;color:var(--c);flex:none}`);
