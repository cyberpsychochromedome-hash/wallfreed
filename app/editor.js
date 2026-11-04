/* ---- layered art editor ---- */
const vis=$('cv'),vx=vis.getContext('2d');let layers=[],act,undoS=[],dn=false,st,lid=0;
function addL(){const c=document.createElement('canvas');c.width=W;c.height=H;
 act={id:++lid,name:'Layer '+lid,c,x:c.getContext('2d'),v:true,o:1};layers.push(act);rl();draw()}
function delL(){if(layers.length<2)return;layers=layers.filter(l=>l!==act);act=layers[layers.length-1];rl();draw()}
function mv(d){const i=layers.indexOf(act),j=i+d;if(j<0||j>=layers.length)return;[layers[i],layers[j]]=[layers[j],layers[i]];rl();draw()}
function rl(){const el=$('ly');el.innerHTML='';[...layers].reverse().forEach(l=>{const d=document.createElement('div');
 d.style.cssText='padding:4px;margin:3px 0;cursor:pointer;border:1px solid '+(l===act?'#ff66cc':'#444');
 d.innerHTML='<input type=checkbox'+(l.v?' checked':'')+'> <span></span> <input type=range min=0 max=1 step=.05 value='+l.o+' style=width:70px>';
 d.querySelector('span').textContent=l.name;const[cb,rg]=d.querySelectorAll('input');
 cb.onclick=e=>{e.stopPropagation();l.v=cb.checked;draw()};rg.onclick=e=>e.stopPropagation();rg.oninput=()=>{l.o=+rg.value;draw()};
 d.onclick=()=>{act=l;rl()};el.append(d)})}
function draw(ov){vx.fillStyle=$('bg').value;vx.fillRect(0,0,W,H);
 layers.forEach(l=>{if(l.v){vx.globalAlpha=l.o;vx.drawImage(l.c,0,0)}});vx.globalAlpha=1;if(ov)ov(vx)}
function pos(e){const r=vis.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]}
function snap(){undoS.push([act,act.x.getImageData(0,0,W,H)]);if(undoS.length>20)undoS.shift()}
function undo(){const s=undoS.pop();if(s){s[0].x.putImageData(s[1],0,0);draw()}}
function clr(){snap();act.x.clearRect(0,0,W,H);draw()}
function shape(x,t,a,b){x.strokeStyle=x.fillStyle=$('bc').value;x.lineWidth=$('bs').value;x.lineCap='round';x.beginPath();
 if(t=='line'){x.moveTo(...a);x.lineTo(...b);x.stroke();return}
 if(t=='rect')x.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
 else x.ellipse((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(b[0]-a[0])/2,Math.abs(b[1]-a[1])/2,0,0,7);
 $('fill').checked?x.fill():x.stroke()}
vis.onmousedown=e=>{const p=pos(e),t=$('tool').value;snap();
 if(t=='text'){const x=act.x;x.fillStyle=$('bc').value;x.font=($('bs').value*3)+'px '+$('ft').value;x.textBaseline='top';x.fillText($('tx').value,...p);draw();return}
 dn=true;st=p;act.x.beginPath();act.x.moveTo(...p)};
vis.onmousemove=e=>{if(!dn)return;const p=pos(e),t=$('tool').value,x=act.x;
 if(t=='brush'||t=='eraser'){x.globalCompositeOperation=t=='eraser'?'destination-out':'source-over';
  x.strokeStyle=$('bc').value;x.lineWidth=$('bs').value;x.lineCap=x.lineJoin='round';x.lineTo(...p);x.stroke();
  x.globalCompositeOperation='source-over';x.beginPath();x.moveTo(...p);draw()}
 else draw(v=>shape(v,t,st,p))};
addEventListener('mouseup',e=>{if(!dn)return;dn=false;const t=$('tool').value;
 if(['line','rect','ellipse'].includes(t))shape(act.x,t,st,pos(e));draw()});
/* ---- live / interactive generator ---- */
function mm(){const a=$('mode').value=='art';$('ao').classList.toggle('hide',!a);$('wrap').firstElementChild.classList.toggle('hide',!a);
 $('ly-box').classList.toggle('hide',!a);$('lo').classList.toggle('hide',a);$('pv').classList.toggle('hide',a);upd()}
function gen(){const c1=$('c1').value,c2=$('c2').value,sp=+$('sp2').value,p=$('ps').value,it=$('mode').value=='interactive';
return `<!doctype html><body style="margin:0;overflow:hidden;background:#000"><canvas id=c></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d'),m={x:.5,y:.5};let W,H;
function rs(){W=c.width=innerWidth;H=c.height=innerHeight}rs();onresize=rs;
${it?"onmousemove=e=>{m.x=e.clientX/W;m.y=e.clientY/H};":""}
const P=Array.from({length:150},()=>({x:Math.random(),y:Math.random(),v:Math.random()+.3}));let t=0;
(function f(){t+=${sp}/200;x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,0,W,H);
if('${p}'=='waves'){for(let i=0;i<6;i++){x.beginPath();x.strokeStyle=i%2?'${c1}':'${c2}';x.lineWidth=3;
 for(let k=0;k<=W;k+=8){const y=H/2+Math.sin(k/150+t+i)*(60+i*20+m.y*120)+(i-3)*30;k?x.lineTo(k,y):x.moveTo(k,y)}x.stroke()}}
else{P.forEach((q,i)=>{q.y=(q.y+q.v*${sp}/1500)%1;const st='${p}'=='stars';
 const px=((q.x+(m.x-.5)*q.v*.2)%1+1)%1*W,py=st?H/2+(q.y-.5)*H*(1+q.v):q.y*H;
 x.fillStyle=i%2?'${c1}':'${c2}';x.beginPath();x.arc(px,py,q.v*3,0,7);x.fill()})}
requestAnimationFrame(f)})();<\/script>`}
function upd(){if($('mode').value=='art')draw();else $('pv').srcdoc=gen()}
async function save(){const m=$('mode').value,name=$('nm').value||'Untitled';
 if(m=='art'){draw();await call('save',{name,type:'art',png:vis.toDataURL('image/png').split(',')[1]})}
 else await call('save',{name,type:m,html:gen()});closeEd()}
addL();
