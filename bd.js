/* Larocq — lecteur de BD. Item projects.json: "type":"bd", "bd":{"pages":["livres/x/001.jpg",...]} ou "bd":"livres/x.cbz" ou "bd":{"dossier":"livres/x/","pages":["001.jpg",...]} */
(function(){
const css=`#bdv{position:fixed;inset:0;z-index:9999;background:#000;display:none;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
#bdv.on{display:block}#bdv .st{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#bdv img.pg{max-width:100%;max-height:100%;object-fit:contain;transform-origin:0 0;will-change:transform;pointer-events:none;-webkit-user-drag:none}
#bdv .ui{position:absolute;left:0;right:0;display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff;font:600 14px system-ui;background:linear-gradient(rgba(0,0,0,.7),transparent);transition:opacity .25s;padding-top:calc(10px + env(safe-area-inset-top))}
#bdv .tp{top:0}#bdv .bt{bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.7));padding-bottom:calc(12px + env(safe-area-inset-bottom))}
#bdv.hid .ui{opacity:0;pointer-events:none}#bdv .ui b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bdv button{background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:999px;min-width:40px;height:40px;font-size:18px;cursor:pointer}
#bdv input[type=range]{flex:1;accent-color:#6ea8ff}#bdv .ms{position:absolute;inset:0;display:grid;place-items:center;color:#aaa;font:15px system-ui;pointer-events:none}`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
const V=document.createElement('div');V.id='bdv';V.innerHTML=`<div class="st"><img class="pg" alt=""></div><div class="ms"></div>
<div class="ui tp"><button class="x" aria-label="Fermer">✕</button><b></b><span class="pc"></span></div>
<div class="ui bt"><button class="pv" aria-label="Précédente">‹</button><input type="range" min="1" value="1" aria-label="Page"><button class="nx" aria-label="Suivante">›</button></div>`;
document.body.appendChild(V);
const I=V.querySelector('img.pg'),MS=V.querySelector('.ms'),PC=V.querySelector('.pc'),T=V.querySelector('b'),R=V.querySelector('input');
let cur=null,pages=[],urls=[],i=0,z=1,tx=0,ty=0,gen=0;
const key=id=>'larocq-bd-'+id;
function base(p){return document.baseURI}
async function resolve(p){const b=p.bd;
 if(typeof b==='string'&&/\.cbz$/i.test(b))return cbz(b);
 if(typeof b==='string'){const r=await fetch(b);const j=await r.json();return list(j,b.replace(/[^/]*$/,''))}
 return list(b,'')}
function list(o,dir){const d=(o.dossier||dir||'');return (o.pages||[]).map(x=>/^(https?:|\/)/.test(x)?x:d+x)}
async function cbz(u){if(!window.JSZip)await loadJs('vendor/jszip.min.js');const z=await JSZip.loadAsync(await (await fetch(u)).arrayBuffer());
 const f=Object.values(z.files).filter(f=>!f.dir&&/\.(jpe?g|png|webp|gif|avif)$/i.test(f.name)&&!/(^|\/)(__MACOSX|\.)/.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 const out=[];for(const x of f){const t=/png$/i.test(x.name)?'image/png':/webp$/i.test(x.name)?'image/webp':/gif$/i.test(x.name)?'image/gif':'image/jpeg';out.push(URL.createObjectURL(new Blob([await x.async('arraybuffer')],{type:t})))}urls=out;return out}
function ap(){I.style.transform=`translate(${tx}px,${ty}px) scale(${z})`}
function rz(){z=1;tx=ty=0;I.style.transformOrigin='50% 50%';ap()}
function clamp(){if(z<=1){rz();return}const w=I.offsetWidth,h=I.offsetHeight,W=innerWidth,H=innerHeight;const mx=Math.max(0,(w*z-W)/2),my=Math.max(0,(h*z-H)/2);tx=Math.min(mx,Math.max(-mx,tx));ty=Math.min(my,Math.max(-my,ty));ap()}
function go(n){if(!pages.length)return;n=Math.max(0,Math.min(pages.length-1,n));i=n;rz();MS.textContent='';I.src=pages[i];PC.textContent=(i+1)+' / '+pages.length;R.value=i+1;try{localStorage.setItem(key(cur.id),String(i))}catch(_){}
 [i+1,i-1].forEach(k=>{if(pages[k]){const im=new Image();im.src=pages[k]}})}
I.onerror=()=>{MS.textContent='Page introuvable'};
window.bdPos=id=>{const v=localStorage.getItem(key(id));return v==null?null:+v};
window.openBD=async function(p){if(cur&&cur.id===p.id&&V.classList.contains('on'))return;const g=++gen;cur=p;pages=[];I.removeAttribute('src');T.textContent=p.titre||'';PC.textContent='';MS.textContent='Chargement…';V.classList.add('on');V.classList.remove('hid');document.body.style.overflow='hidden';
 try{const pg=await resolve(p);if(g!==gen)return;pages=pg;if(!pages.length)throw 0;R.max=pages.length;go(bdPos(p.id)||0)}catch(_){if(g===gen)MS.textContent='BD introuvable'}};
window.closeBD=function(){if(!cur)return;gen++;V.classList.remove('on');urls.forEach(u=>URL.revokeObjectURL(u));urls=[];cur=null;pages=[];I.removeAttribute('src');document.body.style.overflow=''};
window.lireBD=id=>nav('#/bd/'+id);
V.querySelector('.x').onclick=e=>{e.stopPropagation();history.length>1&&/^#\/bd\//.test(location.hash)?history.back():nav('#/')};
V.querySelector('.pv').onclick=e=>{e.stopPropagation();go(i-1)};V.querySelector('.nx').onclick=e=>{e.stopPropagation();go(i+1)};
R.oninput=()=>go(R.value-1);V.querySelectorAll('.ui').forEach(u=>u.addEventListener('pointerdown',e=>e.stopPropagation()));
document.addEventListener('keydown',e=>{if(!cur)return;if(e.key==='ArrowRight'||e.key===' ')go(i+1);else if(e.key==='ArrowLeft')go(i-1);else if(e.key==='Escape')V.querySelector('.x').click()});
// gestes
const P=new Map();let st=null,lastTap=0,moved=false;
const st0=V.querySelector('.st');
st0.addEventListener('pointerdown',e=>{st0.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
 if(P.size===2){const [a,b]=[...P.values()];st={d:Math.hypot(a.x-b.x,a.y-b.y),z,tx,ty,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}}
 else st={x:e.clientX,y:e.clientY,tx,ty,t:Date.now()}});
st0.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(P.size===2&&st&&st.d){const [a,b]=[...P.values()];const nz=Math.max(1,Math.min(5,st.z*Math.hypot(a.x-b.x,a.y-b.y)/st.d));const cx=st.cx-innerWidth/2,cy=st.cy-innerHeight/2;tx=cx-(cx-st.tx)*nz/st.z;ty=cy-(cy-st.ty)*nz/st.z;z=nz;moved=true;ap()}
 else if(P.size===1&&st&&st.x!=null){const dx=e.clientX-st.x,dy=e.clientY-st.y;if(Math.abs(dx)+Math.abs(dy)>8)moved=true;if(z>1){tx=st.tx+dx;ty=st.ty+dy;ap()}}});
function up(e){if(!P.has(e.pointerId))return;P.delete(e.pointerId);
 if(P.size===1){const [a]=[...P.values()];st={x:a.x,y:a.y,tx,ty,t:Date.now()};moved=true;clamp();return}
 if(P.size)return;const s=st;st=null;if(!s||s.x==null){clamp();return}
 const dx=e.clientX-s.x,dy=e.clientY-s.y;
 if(z>1){clamp();if(!moved)tap(e);return}
 if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){go(i+(dx<0?1:-1));return}
 if(!moved)tap(e)}
let tt=null;
function tap(e){const now=Date.now();if(now-lastTap<300){clearTimeout(tt);lastTap=0;
  if(z>1)rz();else{z=2.5;const cx=e.clientX-innerWidth/2,cy=e.clientY-innerHeight/2;tx=-cx*(z-1);ty=-cy*(z-1);clamp()}return}
 lastTap=now;const x=e.clientX/innerWidth;tt=setTimeout(()=>{if(z>1){V.classList.toggle('hid');return}if(x<.3)go(i-1);else if(x>.7)go(i+1);else V.classList.toggle('hid')},300)}
st0.addEventListener('pointerup',up);st0.addEventListener('pointercancel',up);
addEventListener('resize',()=>{if(cur)clamp()});
})();
