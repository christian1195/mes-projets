/* Larocq — Story Player (images synchronisées à l'audio). Item projects.json: "film":{"dossier":"livres/x/","chapitres":[{"titre":"","audio":"url","duree":s,"scenes":[{"at":s,"image":"x.jpg","titre":""}]}]}. Route #/film/<id>[/<chapitre 1-based>]. Usage perso. */
(()=>{
const css=`#flv{position:fixed;inset:0;z-index:9999;background:#000;display:none;color:#fff;font:600 14px system-ui;overflow:hidden;user-select:none;-webkit-user-select:none}
#flv.on{display:block}#flv .fls{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#flv .fls img{position:absolute;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 1.2s ease;pointer-events:none}
#flv .fls img.vis{opacity:1;animation:flkb 30s ease-in-out infinite alternate}
@keyframes flkb{from{transform:scale(1)}to{transform:scale(1.07) translate(-1%,-1%)}}
#flv .flu{position:absolute;left:0;right:0;display:flex;align-items:center;gap:10px;padding:10px 14px;transition:opacity .3s}
#flv .flt{top:0;background:linear-gradient(rgba(0,0,0,.75),transparent);padding-top:calc(10px + env(safe-area-inset-top))}
#flv .flb{bottom:0;flex-wrap:wrap;background:linear-gradient(transparent,rgba(0,0,0,.85));padding-bottom:calc(12px + env(safe-area-inset-bottom))}
#flv.hid .flu,#flv.hid .lst{opacity:0;pointer-events:none}#flv .flt b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#flv button{background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:999px;min-width:42px;height:42px;font-size:18px;cursor:pointer}
#flv button.pp{min-width:56px;height:56px;font-size:24px;background:rgba(255,255,255,.25)}
#flv .cap{flex-basis:100%;text-align:center;font-weight:650;font-size:15px;text-shadow:0 1px 4px #000;min-height:20px}
#flv .flr{flex-basis:100%;display:flex;align-items:center;gap:10px}#flv .flr.c{justify-content:center;gap:18px}
#flv input[type=range]{flex:1;accent-color:#e0b45c}#flv small{font-variant-numeric:tabular-nums;color:#ddd;min-width:44px;text-align:center}
#flv .lst{position:absolute;top:calc(64px + env(safe-area-inset-top));right:10px;max-height:70%;overflow:auto;background:rgba(20,20,24,.95);border-radius:14px;padding:6px;display:none;min-width:240px}
#flv .lst.on{display:block}#flv .lst div{padding:11px 12px;border-radius:10px;cursor:pointer}#flv .lst div.cur{background:rgba(224,180,92,.25)}
#flv .ms{position:absolute;inset:0;display:grid;place-items:center;color:#aaa;pointer-events:none}`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
const V=document.createElement('div');V.id='flv';V.innerHTML=`<div class="fls"><img alt=""><img alt=""></div><div class="ms"></div>
<div class="flu flt"><button class="flx" aria-label="Fermer">✕</button><b></b><button class="flc" aria-label="Chapitres">☰</button></div><div class="lst"></div>
<div class="flu flb"><div class="cap"></div><div class="flr"><small class="t0">0:00</small><input type="range" min="0" max="1000" value="0" aria-label="Position"><small class="t1">0:00</small></div>
<div class="flr c"><button class="pv" aria-label="Chapitre précédent">⏮</button><button class="rw" aria-label="Reculer 15 s">↺</button><button class="pp" aria-label="Lecture">▶</button><button class="fw" aria-label="Avancer 30 s">↻</button><button class="nx" aria-label="Chapitre suivant">⏭</button></div></div>`;
document.body.appendChild(V);
const A=new Audio();A.preload='metadata';
const q=x=>V.querySelector(x),IM=[...V.querySelectorAll('.fls img')],T=q('.flt b'),CAP=q('.cap'),R=q('input'),PP=q('.pp'),L=q('.lst'),MS=q('.ms');
let P=null,ci=0,cur=-1,ib=0,hideT=0,seeking=0;
const key=id=>'larocq-film-'+id,fmt=t=>{t=Math.max(0,t|0);const h=t/3600|0,m=(t%3600)/60|0,s=t%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0')};
window.filmPos=id=>{try{return JSON.parse(localStorage.getItem(key(id)))}catch(_){return null}};
const save=()=>{if(P)localStorage.setItem(key(P.id),JSON.stringify({c:ci,t:Math.floor(A.currentTime||0)}))};
const C=()=>P.film.chapitres[ci],src=n=>P.film.dossier+n;
function show(k){if(k===cur)return;cur=k;const sc=C().scenes[k];ib^=1;const im=IM[ib];im.onload=()=>{im.classList.add('vis');IM[ib^1].classList.remove('vis')};im.src=src(sc.image);CAP.textContent=sc.titre||''}
function sync(){const sc=C().scenes,t=A.currentTime||0;let k=0;for(let i=0;i<sc.length;i++)if(sc[i].at<=t+.05)k=i;show(k);if(!seeking){const d=A.duration||C().duree;R.value=d?t/d*1000:0;q('.t0').textContent=fmt(t);q('.t1').textContent=fmt(d)}}
function load(i,t,play){ci=Math.max(0,Math.min(i,P.film.chapitres.length-1));cur=-1;const c=C();T.textContent=`Ch. ${ci+1} · ${c.titre}`;MS.textContent='';A.src=c.audio;A.currentTime=0;
 const go=()=>{if(t)A.currentTime=t;sync();if(play)A.play().catch(()=>{})};A.readyState>=1?go():A.addEventListener('loadedmetadata',go,{once:true});sync();lst();if(location.hash!=='#/film/'+P.id+'/'+(ci+1))history.replaceState({app:1},'','#/film/'+P.id+'/'+(ci+1))}
function lst(){L.innerHTML=P.film.chapitres.map((c,i)=>`<div data-i="${i}" class="${i==ci?'cur':''}">${i+1}. ${c.titre} <small>${fmt(c.duree)}</small></div>`).join('')}
function poke(){V.classList.remove('hid');clearTimeout(hideT);if(!A.paused)hideT=setTimeout(()=>{if(!L.classList.contains('on'))V.classList.add('hid')},3500)}
A.ontimeupdate=()=>{sync();if((A.currentTime|0)%5==0)save()};A.onplay=()=>{PP.textContent='❚❚';poke()};A.onpause=()=>{PP.textContent='▶';save();poke()};
A.onended=()=>{if(ci<P.film.chapitres.length-1)load(ci+1,0,1);else{save()}};A.onerror=()=>{MS.textContent='Audio introuvable'};
PP.onclick=e=>{e.stopPropagation();A.paused?A.play().catch(()=>{}):A.pause()};
q('.rw').onclick=e=>{e.stopPropagation();A.currentTime=Math.max(0,A.currentTime-15)};q('.fw').onclick=e=>{e.stopPropagation();A.currentTime=Math.min(A.duration||1e9,A.currentTime+30)};
q('.pv').onclick=e=>{e.stopPropagation();A.currentTime>5?A.currentTime=0:load(ci-1,0,!A.paused)};q('.nx').onclick=e=>{e.stopPropagation();load(ci+1,0,!A.paused)};
q('.flc').onclick=e=>{e.stopPropagation();L.classList.toggle('on')};L.onclick=e=>{e.stopPropagation();const d=e.target.closest('[data-i]');if(d){L.classList.remove('on');load(+d.dataset.i,0,1)}};
R.oninput=()=>{seeking=1;const d=A.duration||C().duree;q('.t0').textContent=fmt(R.value/1000*d)};R.onchange=()=>{const d=A.duration||C().duree;A.currentTime=R.value/1000*d;seeking=0};
R.onclick=e=>e.stopPropagation();V.onclick=()=>{L.classList.remove('on');V.classList.contains('hid')?poke():(A.paused?poke():V.classList.add('hid'))};
window.openFilm=(p,ch)=>{if(P&&P.id===p.id&&V.classList.contains('on')){if(ch&&ch-1!==ci)load(ch-1,0,!A.paused);return}P=p;V.classList.add('on');document.documentElement.style.overflow='hidden';const s=filmPos(p.id);
 if(ch)load(ch-1,s&&s.c==ch-1?s.t:0,0);else load(s?s.c:0,s?s.t:0,0);poke();
 if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'Mountain of the Gods',artist:'Story Player',artwork:[{src:p.couverture,sizes:'600x900',type:'image/jpeg'}]});navigator.mediaSession.setActionHandler('nexttrack',()=>load(ci+1,0,1));navigator.mediaSession.setActionHandler('previoustrack',()=>load(ci-1,0,1))}};
window.closeFilm=()=>{if(!V.classList.contains('on'))return;save();A.pause();V.classList.remove('on');document.documentElement.style.overflow='';P=null};
window.regarder=(id,ch)=>nav('#/film/'+id+(ch?'/'+ch:''));
q('.flx').onclick=e=>{e.stopPropagation();history.length>1&&/^#\/film\//.test(location.hash)?history.back():nav('#/')};
document.addEventListener('keydown',e=>{if(!V.classList.contains('on'))return;if(e.key==' '){e.preventDefault();PP.click()}else if(e.key=='Escape')q('.flx').click()});
})();
