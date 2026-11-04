const $=id=>document.getElementById(id),W=1280,H=720,call=(...a)=>api.call(...a);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEF={volume:50,rate:100,align:'cover',pos:50,flip:false,filter:'none',scheme:'#000000'};
const TY={video:'Video',web:'Web',art:'Image',live:'Live',interactive:'Interactive'};
let all=[],sel=null,pl=[],plSel=null,P={},cfg={},ws=[];
const th=w=>w.thumb?`<img class=th src="${w.thumb}">`:w.media?`<video class=th src="${w.media}#t=0.5" preload=metadata muted></video>`:`<div class="th ph"></div>`;
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('hide');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hide'),2500)}
function modal(h){$('mdc').innerHTML=h;$('md').classList.remove('hide')}const closeM=()=>$('md').classList.add('hide');
async function refresh(){[all,cfg,P]=await Promise.all([call('list'),call('cfg'),call('allprops')]);
 pl=(cfg.playlist||[]).filter(i=>all.some(w=>w.id==i));if(sel&&!all.some(w=>w.id==sel))sel=null;render();panel()}
function render(){const q=$('q').value.toLowerCase(),s=$('sort').value;
 const l=all.filter(w=>w.name.toLowerCase().includes(q));
 l.sort(s=='Type'?(a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name):s=='Newest'?(a,b)=>b.id.localeCompare(a.id):(a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
 $('grid').innerHTML=l.map(w=>`<div class="card${w.id==sel?' sel':''}" data-id="${w.id}">${th(w)}<div class=nm>${esc(w.name)}</div><div class="ck${pl.includes(w.id)?' on':''}"></div></div>`).join('')||'<p class=c style="grid-column:1/-1">No wallpapers yet. Use “Open Wallpaper”, the Workshop tab, or the Wallpaper Editor.</p>';
 $('pln').textContent=pl.length;
 $('pls').innerHTML=pl.map(id=>{const w=all.find(x=>x.id==id);return `<div class="pt${id==plSel?' sel':''}" data-id="${id}">${th(w)}</div>`}).join('')}
$('grid').onclick=e=>{const c=e.target.closest('.card');if(!c)return;const id=c.dataset.id;
 if(e.target.classList.contains('ck'))togglePl(id);else{sel=id;render();panel()}};
$('grid').ondblclick=e=>{const c=e.target.closest('.card');if(c){call('play',[c.dataset.id]);toast('Wallpaper applied')}};
$('pls').onclick=e=>{const c=e.target.closest('.pt');plSel=c?c.dataset.id:null;render()};
const savePl=()=>call('setcfg',{playlist:pl});
function togglePl(id){pl=pl.includes(id)?pl.filter(i=>i!=id):[...pl,id];savePl();render()}
function plRemove(){if(plSel){pl=pl.filter(i=>i!=plSel);plSel=null;savePl();render()}}
function plClear(){pl=[];plSel=null;savePl();render()}
async function plSave(){await call('jsave',{ids:pl,interval:cfg.interval,shuffle:cfg.shuffle})}
async function plLoad(){const o=await call('jload');if(o&&Array.isArray(o.ids)){pl=o.ids.filter(i=>all.some(w=>w.id==i));await call('setcfg',{playlist:pl,interval:o.interval||5,shuffle:!!o.shuffle});await refresh()}}
function plCfg(){modal(`<h3>Playlist settings</h3><div class=row><label>Switch every (min)</label><input type=number min=1 id=iv value=${cfg.interval}></div><div class=row><label>Shuffle</label><input type=checkbox id=sh ${cfg.shuffle?'checked':''}></div><button class="btn pri" onclick=plCfgSave()>Save</button>`)}
async function plCfgSave(){await call('setcfg',{interval:+$('iv').value||5,shuffle:$('sh').checked});cfg=await call('cfg');closeM()}
async function ok(){const ids=pl.length?pl:(sel?[sel]:[]);if(ids.length)await call('play',ids);window.close()}
/* ---- right panel ---- */
function setP(k,v){const p=P[sel]=P[sel]||{};p[k]=v;call('props',sel,p)}
function setX(k,v){const p=P[sel]=P[sel]||{};p.x=p.x||{};p.x[k]=v;call('props',sel,p)}
const opt=(l,v)=>l.map(([a,b])=>`<option value="${a}"${a==v?' selected':''}>${b}</option>`).join('');
function panel(){const w=all.find(x=>x.id==sel),R=$('right');
 if(!w){R.innerHTML='<p class=c style="margin-top:40px">Select a wallpaper</p>';return}
 const p={...DEF,...P[sel]},num=(k,min,max)=>`<input type=range min=${min} max=${max} value=${p[k]} oninput="setP('${k}',+this.value);this.nextElementSibling.textContent=this.value"><span class=v>${p[k]}</span>`;
 const ex=Object.entries(w.props||{}).map(([k,d])=>{const v=(p.x&&k in p.x)?p.x[k]:d.value,t=esc(d.text||k),ek=esc(k);
  return d.type=='bool'?`<div class=row><label>${t}</label><input type=checkbox ${v?'checked':''} onchange="setX('${ek}',this.checked)"></div>`
   :`<div class=row><label>${t}</label><input type=range min=${d.min??0} max=${d.max??100} step=${d.step||'any'} value=${v} oninput="setX('${ek}',+this.value)"></div>`}).join('');
 R.innerHTML=`<div class=pv>${th(w)}</div><h2>${esc(w.name)}</h2><div class=c>${TY[w.type]||esc(w.type)}</div><br>
 <button class="btn pri" style="width:100%" onclick=openIn()>Open in Editor</button>
 <p class=c>Open this wallpaper in the editor to edit or delete it.</p>
 <h4>Properties</h4>
 <div class=row><label>&#127912; Scheme color</label><input type=color value="${p.scheme}" oninput="setP('scheme',this.value)"></div>
 <div class=row><label>&#128266; Volume</label>${num('volume',0,100)}</div>
 <div class=row><label>&#9654; Playback rate</label>${num('rate',25,200)}</div>
 <div class=row><label>&#128444; Alignment</label><select onchange="setP('align',this.value)">${opt([['cover','Cover'],['fit','Fit'],['stretch','Stretch'],['center','Center']],p.align)}</select></div>
 <div class=row><label>&#8596; Position</label>${num('pos',0,100)}</div>
 <div class=row><label>&#8644; Flip</label><input type=checkbox ${p.flip?'checked':''} onchange="setP('flip',this.checked)"></div>
 <div class=row><label>&#128247; Image filter</label><select onchange="setP('filter',this.value)">${opt([['none','None'],['grayscale','Grayscale'],['sepia','Sepia'],['blur','Blur'],['invert','Invert']],p.filter)}</select></div>
 ${ex}
 <h4>Your Presets</h4>
 <div class=two><button class=btn onclick=preLoad()>&#128194; Load</button><button class=btn onclick="call('jsave',P[sel]||{})">&#128190; Save</button></div>
 <div class=two style="grid-template-columns:1fr;margin-top:6px"><button class=btn onclick=applyAll()>Apply to all Wallpapers</button><button class=btn onclick="call('clip',JSON.stringify(P[sel]||{}));toast('Copied JSON')">Share JSON</button><button class="btn red" onclick=preReset()>Reset</button></div>
 <p style="text-align:center;margin-top:16px"><a href=# style="color:#e65a4d" onclick="delW();return false">Delete this wallpaper</a></p>`}
async function preLoad(){const o=await call('jload');if(o&&sel){P[sel]=o;await call('props',sel,o);panel()}}
async function applyAll(){await call('applyall',P[sel]||{});P=await call('allprops');toast('Applied to all wallpapers')}
async function preReset(){delete P[sel];await call('props',sel,{});panel()}
async function delW(){if(sel&&confirm('Delete this wallpaper from your library?')){await call('del',sel);sel=null;refresh()}}
function openIn(){const w=all.find(x=>x.id==sel);if(!w)return;if(w.type=='art'&&w.thumb)openEd(w.thumb);else call('folder',w.id)}
/* ---- tabs, settings, displays ---- */
function tabTo(t){const i=t=='inst';$('t1').classList.toggle('on',i);$('t3').classList.toggle('on',!i);
 $('grid').classList.toggle('hide',!i);$('tb').classList.toggle('hide',!i);$('wsv').classList.toggle('hide',i);$('wsv').style.display=i?'':'flex';if(!i&&!ws.length)wsScan()}
function settings(){modal(`<h3>Settings</h3><p><label><input type=checkbox id=s1 ${cfg.behind!==false?'checked':''}> Show wallpaper behind desktop icons</label></p><p><label><input type=checkbox id=s2 ${cfg.login?'checked':''}> Start with Windows</label></p><button class="btn pri" onclick=setSave()>OK</button> <button class=btn onclick=closeM()>Cancel</button>`)}
async function setSave(){await call('setcfg',{behind:$('s1').checked,login:$('s2').checked});cfg=await call('cfg');closeM()}
async function displays(){const d=await call('displays');modal(`<h3>Displays</h3>${d.map(x=>`<p><label><input type=radio name=dp value=${x.i} ${x.i==(cfg.display||0)?'checked':''}> ${esc(x.label)}</label></p>`).join('')}<button class="btn pri" onclick=dispSave()>OK</button> <button class=btn onclick=closeM()>Cancel</button>`)}
async function dispSave(){const r=document.querySelector('input[name=dp]:checked');if(r)await call('setcfg',{display:+r.value});cfg=await call('cfg');closeM()}
/* ---- Wallpaper Engine / Workshop import ---- */
function wsRender(){$('wsl').innerHTML=ws.map((w,i)=>`<div class=wr><input type=checkbox data-i=${i} ${w.ok?'checked':'disabled'}><div class=t>${w.thumb?`<img class=th src="${w.thumb}">`:'<div class="th ph"></div>'}</div><div>${esc(w.title)}<br><span class=c>${esc(w.type)}${w.ok?'':' — not supported yet'}</span></div></div>`).join('')||'<p class=c>Nothing found. Try “Choose folder…” and pick your Steam workshop folder (steamapps\\workshop\\content\\431960).</p>'}
async function wsScan(){$('wsm').textContent='Scanning…';ws=await call('wescan');$('wsm').textContent=ws.length+' found';wsRender()}
async function wsBrowse(){ws=await call('webrowse');$('wsm').textContent=ws.length+' found';wsRender()}
async function wsImport(){const d=[...document.querySelectorAll('#wsl input:checked')].map(c=>ws[+c.dataset.i].dir);if(!d.length)return;
 $('wsm').textContent='Importing…';const n=await call('weimport',d);$('wsm').textContent='Imported '+n+' of '+d.length;await refresh()}
/* ---- editor overlay ---- */
function openEd(url){$('ed').classList.remove('hide');if(url){const im=new Image();im.onload=()=>{addL();act.x.drawImage(im,0,0,W,H);draw();rl()};im.src=url}}
function closeEd(){$('ed').classList.add('hide');refresh()}
refresh();
