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
