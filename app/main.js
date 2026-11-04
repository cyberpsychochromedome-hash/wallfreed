const {app,BrowserWindow,ipcMain,dialog,screen,Tray,Menu,shell,clipboard}=require('electron');
const path=require('path'),fs=require('fs'),{execFile}=require('child_process'),{pathToFileURL}=require('url');
const lock=app.requestSingleInstanceLock();
let win,wp,tray,poll,timer,cur=null;
const icon=path.join(__dirname,'icon.png');
const ud=f=>path.join(app.getPath('userData'),f);
const dir=()=>{const d=ud('wallpapers');fs.mkdirSync(d,{recursive:true});return d};
const rj=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''))}catch{return d}};
const rc=()=>({behind:true,playlist:[],playing:[],interval:5,shuffle:false,display:0,...rj(ud('cfg.json'),{})});
const wc=o=>fs.writeFileSync(ud('cfg.json'),JSON.stringify({...rc(),...o}));
const rp=()=>rj(ud('props.json'),{});
const wrp=a=>fs.writeFileSync(ud('props.json'),JSON.stringify(a));
const attachExe=()=>app.isPackaged?path.join(process.resourcesPath,'attach.exe'):path.join(__dirname,'bin','attach.exe');
const U=p=>pathToFileURL(p).href;
const MEDIA=['mp4','webm','ogv','gif','png','jpg','jpeg','webp'],VID=['mp4','webm','ogv'];
const list=()=>fs.readdirSync(dir()).map(id=>{const m=rj(path.join(dir(),id,'wallpaper.json'));if(!m)return null;
  const f=n=>n&&fs.existsSync(path.join(dir(),id,n))?U(path.join(dir(),id,n)):null;
  return{id,...m,thumb:f(m.preview),media:m.type==='video'?f(m.media):null}}).filter(Boolean);
/* ---- wrapper page for images/videos (supports the Properties panel) ---- */
const wrap=(f,v)=>`<!doctype html><meta charset=utf-8><body style="margin:0;overflow:hidden;background:#000">${v?`<video id=m src="${f}" autoplay loop playsinline></video>`:`<img id=m src="${f}">`}<script>
const m=document.getElementById('m'),D={volume:50,rate:100,align:'cover',pos:50,flip:false,filter:'none',scheme:'#000000'};
const A={cover:'cover',fit:'contain',stretch:'fill',center:'none'},F={none:'none',grayscale:'grayscale(1)',sepia:'sepia(1)',blur:'blur(6px)',invert:'invert(1)'};
window.__wp=function(p){p=Object.assign({},D,p||{});document.body.style.background=p.scheme;
 m.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;object-fit:'+A[p.align]+';object-position:'+p.pos+'% 50%;transform:scaleX('+(p.flip?-1:1)+');filter:'+F[p.filter];
 if(m.play){m.volume=p.volume/100;m.muted=p.volume==0;m.playbackRate=p.rate/100}};
try{__wp(JSON.parse(new URLSearchParams(location.search).get('p')||'{}'))}catch(e){__wp({})}
<\/script>`;
function newDir(){const id=Date.now().toString(36)+Math.random().toString(36).slice(2,5),d=path.join(dir(),id);fs.mkdirSync(d);return d}
const fin=(d,m)=>fs.writeFileSync(path.join(d,'wallpaper.json'),JSON.stringify(m));
function importMedia(f,name,prev){const ext=path.extname(f).slice(1).toLowerCase(),v=VID.includes(ext),d=newDir();
  fs.copyFileSync(f,path.join(d,'media.'+ext));fs.writeFileSync(path.join(d,'index.html'),wrap('media.'+ext,v));
  let pv=v?null:'media.'+ext;
  if(prev&&fs.existsSync(prev)){pv='prev'+path.extname(prev);fs.copyFileSync(prev,path.join(d,pv))}
  fin(d,{name,type:v?'video':'art',entry:'index.html',media:'media.'+ext,preview:pv})}
/* ---- Wallpaper Engine import (video / web / image projects) ---- */
const supported=pj=>{const t=String(pj.type||'').toLowerCase(),e=path.extname(pj.file||'').slice(1).toLowerCase();return t==='web'||e==='html'||MEDIA.includes(e)};
function importProject(src){const pj=rj(path.join(src,'project.json'));if(!pj||!pj.file||!supported(pj))return 0;
  const name=pj.title||path.basename(src),ext=path.extname(pj.file).slice(1).toLowerCase();
  if(ext==='html'||String(pj.type).toLowerCase()==='web'){
    const d=newDir(),props={};fs.cpSync(src,d,{recursive:true});
    for(const[k,v]of Object.entries(pj.general&&pj.general.properties||{}))if(['slider','bool'].includes(v.type))props[k]={type:v.type,value:v.value,text:v.text,min:v.min,max:v.max,step:v.step};
    fin(d,{name,type:'web',entry:pj.file,preview:pj.preview,props});return 1}
  const f=path.join(src,pj.file);if(!fs.existsSync(f))return 0;
  importMedia(f,name,pj.preview&&path.join(src,pj.preview));return 1}
function weRoots(){const b=[process.env['ProgramFiles(x86)']+'\\Steam',process.env.ProgramFiles+'\\Steam'];
  for(const l of 'CDEFG')b.push(l+':\\SteamLibrary',l+':\\Steam',l+':\\Games\\Steam');
  const s=['steamapps\\workshop\\content\\431960','steamapps\\common\\wallpaper_engine\\projects\\myprojects','steamapps\\common\\wallpaper_engine\\projects\\defaultprojects'];
  return b.flatMap(x=>s.map(y=>x+'\\'+y)).filter(p=>fs.existsSync(p))}
function scan(roots){const out=[],seen=new Set();
  for(const r of roots){let ds=[];try{ds=fs.existsSync(path.join(r,'project.json'))?[r]:fs.readdirSync(r).map(n=>path.join(r,n))}catch{}
    for(const d of ds){if(seen.has(d))continue;seen.add(d);const pj=rj(path.join(d,'project.json'));if(!pj)continue;
      out.push({dir:d,title:pj.title||path.basename(d),type:String(pj.type||'?').toLowerCase(),ok:supported(pj),
        thumb:pj.preview&&fs.existsSync(path.join(d,pj.preview))?U(path.join(d,pj.preview)):null})}}
  return out}
/* ---- wallpaper window ---- */
function stopWp(){clearInterval(poll);if(wp){const w=wp;wp=null;w.close()}}
function pushProps(id){if(!wp||wp.isDestroyed())return;const m=list().find(w=>w.id===id)||{},p=rp()[id]||{},u={};
  for(const[k,d]of Object.entries(m.props||{}))u[k]={value:(p.x&&k in p.x)?p.x[k]:d.value};
  wp.webContents.executeJavaScript(`window.__wp&&__wp(${JSON.stringify(p)});var l=window.wallpaperPropertyListener;if(l&&l.applyUserProperties)l.applyUserProperties(${JSON.stringify(u)});0`).catch(()=>{})}
function setWp(id){
  const m=list().find(w=>w.id===id);if(!m)return;stopWp();cur=id;
  const d=screen.getAllDisplays()[rc().display]||screen.getPrimaryDisplay(),{x,y,width,height}=d.bounds,sf=d.scaleFactor;
  const w=wp=new BrowserWindow({x,y,width,height,frame:false,skipTaskbar:true,focusable:false,resizable:false,movable:false,show:false,
    webPreferences:{preload:path.join(__dirname,'wpPreload.js'),contextIsolation:false,sandbox:true,autoplayPolicy:'no-user-gesture-required'}});
  w.loadFile(path.join(dir(),id,m.entry),{query:{p:JSON.stringify(rp()[id]||{})}});
  w.webContents.on('did-finish-load',()=>pushProps(id));
  w.once('ready-to-show',()=>{w.show();
    if(rc().behind!==false&&process.platform==='win32'){
      const h=w.getNativeWindowHandle(),hw=(h.length>=8?h.readBigUInt64LE(0):BigInt(h.readUInt32LE(0))).toString();
      execFile(attachExe(),[hw,x*sf,y*sf,width*sf,height*sf].map(v=>String(Math.round(+v||0))),e=>{if(e)console.log('attach failed:',e.message)})}
    poll=setInterval(()=>{if(wp!==w||w.isDestroyed())return;const p=screen.getCursorScreenPoint();
      w.webContents.executeJavaScript(`dispatchEvent(new MouseEvent('mousemove',{clientX:${p.x-x},clientY:${p.y-y}}))`).catch(()=>{})},33)});
  w.on('closed',()=>{if(wp===w){wp=null;clearInterval(poll)}})}
function play(ids){clearInterval(timer);ids=ids.filter(i=>list().some(w=>w.id===i));if(!ids.length)return;
  const c=rc();wc({active:true,playing:ids});let i=0;setWp(ids[0]);
  if(ids.length>1)timer=setInterval(()=>{i=c.shuffle?Math.floor(Math.random()*ids.length):(i+1)%ids.length;setWp(ids[i])},Math.max(1,c.interval)*60000)}
const stopAll=()=>{clearInterval(timer);stopWp();wc({active:false})};
/* ---- IPC ---- */
const H=(n,f)=>ipcMain.handle(n,(e,...a)=>f(...a));
H('list',list);H('cfg',rc);H('allprops',rp);
H('play',play);H('stop',stopAll);
H('setcfg',o=>{wc(o);if('login' in o)app.setLoginItemSettings({openAtLogin:!!o.login,args:['--hidden']});if(('behind' in o||'display' in o)&&cur&&wp)setWp(cur)});
H('props',(id,p)=>{const a=rp();if(p&&Object.keys(p).length)a[id]=p;else delete a[id];wrp(a);if(cur===id)pushProps(id)});
H('applyall',p=>{const{x,...q}=p||{},a=rp();list().forEach(w=>{a[w.id]={...q,...(a[w.id]&&a[w.id].x?{x:a[w.id].x}:{})}});wrp(a);if(cur)pushProps(cur)});
H('del',id=>{fs.rmSync(path.join(dir(),id),{recursive:true,force:true});const a=rp();delete a[id];wrp(a);if(cur===id)stopAll()});
H('folder',id=>shell.showItemInFolder(path.join(dir(),id,'wallpaper.json')));
H('ext',u=>{if(/^https:\/\/steamcommunity\.com\//.test(u))shell.openExternal(u)});
H('clip',t=>clipboard.writeText(t));
H('displays',()=>screen.getAllDisplays().map((d,i)=>({i,label:`Display ${i+1} - ${d.bounds.width}x${d.bounds.height}${d.id===screen.getPrimaryDisplay().id?' (primary)':''}`})));
H('jsave',async o=>{const r=await dialog.showSaveDialog(win,{filters:[{name:'JSON',extensions:['json']}]});if(!r.canceled)fs.writeFileSync(r.filePath,JSON.stringify(o,null,1))});
H('jload',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'JSON',extensions:['json']}]});return r.canceled?null:rj(r.filePaths[0],null)});
H('wescan',()=>scan(weRoots()));
H('webrowse',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});return r.canceled?[]:scan([r.filePaths[0]])});
H('weimport',dirs=>dirs.reduce((n,d)=>n+(()=>{try{return importProject(d)}catch(e){console.log(e);return 0}})(),0));
H('imp',async()=>{
  const r=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:'Wallpapers',extensions:[...MEDIA,'html']}]});
  if(r.canceled)return;
  for(const f of r.filePaths){const ext=path.extname(f).slice(1).toLowerCase(),n=path.basename(f,'.'+ext);
    if(ext==='html'){const d=newDir();fs.cpSync(path.dirname(f),d,{recursive:true});fin(d,{name:n,type:'web',entry:path.basename(f)})}
    else importMedia(f,n)}});
H('save',({name,type,html,png})=>{const d=newDir();
  if(png){fs.writeFileSync(path.join(d,'art.png'),Buffer.from(png,'base64'));fs.writeFileSync(path.join(d,'index.html'),wrap('art.png',false));fin(d,{name,type,entry:'index.html',media:'art.png',preview:'art.png'})}
  else{fs.writeFileSync(path.join(d,'index.html'),html);fin(d,{name,type,entry:'index.html'})}});
function showWin(){if(win){win.show();win.focus();return}
  win=new BrowserWindow({width:1500,height:960,minWidth:1100,minHeight:700,title:'Wallpaper Studio',icon,autoHideMenuBar:true,backgroundColor:'#1b1e25',webPreferences:{preload:path.join(__dirname,'preload.js')}});
  win.loadFile('index.html');win.on('closed',()=>win=null)}
if(!lock)app.quit();else{
  app.on('second-instance',showWin);
  app.on('window-all-closed',()=>{}); // keep running in the tray so the wallpaper stays
  app.whenReady().then(()=>{
    tray=new Tray(icon);tray.setToolTip('Wallpaper Studio');tray.on('click',showWin);
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Wallpaper Studio',click:showWin},{label:'Stop wallpaper',click:stopAll},{label:'Quit',click:()=>app.quit()}]));
    if(!process.argv.includes('--hidden'))showWin();
    const c=rc();if(c.active&&c.playing.length)play(c.playing);
  });
}
