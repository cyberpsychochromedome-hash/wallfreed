const {contextBridge:c,ipcRenderer:r}=require('electron');
c.exposeInMainWorld('api',{call:(n,...a)=>r.invoke(n,...a)});
