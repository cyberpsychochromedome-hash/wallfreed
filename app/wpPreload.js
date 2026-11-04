// Gives Wallpaper Engine web wallpapers the globals they expect (audio/media listeners)
window.wallpaperRegisterAudioListener=cb=>setInterval(()=>cb(new Array(128).fill(0)),33);
for(const n of ['MediaStatus','MediaProperties','MediaThumbnail','MediaPlaybackListener','MediaTimeline'])window['wallpaperRegister'+n+'Listener']=()=>{};
