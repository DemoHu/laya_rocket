window=window||global,window.layalib||(window.layalib=function(i,e){(window._layalibs||(window._layalibs=[])).push({f:i,i:e})}),window.layalib(function(o,i,a){a.un,a.uns;var e=a.static,r=a.class,t=a.getset,d=(a.__newvec,laya.utils.Browser),n=(laya.events.Event,laya.events.EventDispatcher),f=laya.resource.HTMLImage,g=laya.utils.Handler,l=laya.display.Input,_=laya.net.Loader,s=laya.net.LocalStorage,u=(laya.maths.Matrix,laya.renders.Render),c=laya.utils.RunDriver,h=laya.media.SoundChannel,p=laya.media.SoundManager,y=laya.net.URL,C=laya.utils.Utils,F=function(){function c(){}return r(c,"laya.bd.mini.MiniFileMgr",null,"MiniFileMgr$1"),c.isLocalNativeFile=function(i){for(var e=0,n=b.nativefiles.length;e<n;e++)if(-1!=i.indexOf(b.nativefiles[e]))return!0;return!1},c.getFileInfo=function(i){var e=c.filesListObj[i];return null==e?null:e},c.read=function(i,e,n,t,o,a){var r;void 0===e&&(e="ascill"),void 0===t&&(t=""),void 0===o&&(o=!1),void 0===a&&(a=""),r=""==t||-1==t.indexOf("http://")&&-1==t.indexOf("https://")?i:c.getFileNativePath(i),r=y.getAdptedFilePath(r),c.fs.readFile({filePath:r,encoding:e,success:function(i){null!=n&&n.runWith([0,i])},fail:function(i){i&&""!=t?c.downFiles(t,e,n,t,o,a):null!=n&&n.runWith([1])}})},c.downFiles=function(i,e,n,t,o,a,r){void 0===e&&(e="ascii"),void 0===t&&(t=""),void 0===o&&(o=!1),void 0===a&&(a=""),void 0===r&&(r=!0),c.wxdown({url:i,success:function(i){200===i.statusCode?c.readFile(i.tempFilePath,e,n,t,o,a,r):null!=n&&n.runWith([1,i])},fail:function(i){null!=n&&n.runWith([1,i])}}).onProgressUpdate(function(i){null!=n&&n.runWith([2,i.progress])})},c.readFile=function(e,n,t,o,a,i,r){void 0===n&&(n="ascill"),void 0===o&&(o=""),void 0===a&&(a=!1),void 0===i&&(i=""),void 0===r&&(r=!0),e=y.getAdptedFilePath(e),c.fs.readFile({filePath:e,encoding:n,success:function(i){-1!=e.indexOf("http://")||-1!=e.indexOf("https://")?(b.autoCacheFile||a)&&c.copyFile(e,o,t,n,r):null!=t&&t.runWith([0,i])},fail:function(i){i&&null!=t&&t.runWith([1,i])}})},c.downOtherFiles=function(i,e,n,t,o){void 0===n&&(n=""),void 0===t&&(t=!1),void 0===o&&(o=!0),c.wxdown({url:i,success:function(i){200===i.statusCode?(b.autoCacheFile||t)&&-1==n.indexOf("wx.qlogo.cn")&&-1==n.indexOf(".php")?c.copyFile(i.tempFilePath,n,e,"",o):null!=e&&e.runWith([0,i.tempFilePath]):null!=e&&e.runWith([1,i])},fail:function(i){null!=e&&e.runWith([1,i])}})},c.downLoadFile=function(i,e,n,t){void 0===e&&(e=""),void 0===t&&(t="ascii"),o.navigator.userAgent.indexOf("MiniGame")<0?a.loader.load(i,n):"image"==e||"sound"==e?c.downOtherFiles(i,n,i,!0,!1):c.downFiles(i,t,n,i,!0,e,!1)},c.copyFile=function(i,n,t,o,a){void 0===o&&(o=""),void 0===a&&(a=!0);var e=i.split("/"),r=e[e.length-1],l=c.getFileInfo(n),s=c.getFileNativePath(r),u=c.getCacheUseSize();l?l.readyUrl!=n?c.fs.getFileInfo({filePath:i,success:function(i){a&&52428800<=u+4194304+i.size&&(i.size>b.minClearSize&&(b.minClearSize=i.size),c.onClearCacheRes()),c.deleteFile(r,n,t,o,i.size)},fail:function(i){null!=t&&t.runWith([1,i])}}):null!=t&&t.runWith([0]):c.fs.getFileInfo({filePath:i,success:function(e){a&&52428800<=u+4194304+e.size&&(e.size>b.minClearSize&&(b.minClearSize=e.size),c.onClearCacheRes()),c.fs.copyFile({srcPath:i,destPath:s,success:function(i){c.onSaveFile(n,r,!0,o,t,e.size)},fail:function(i){null!=t&&t.runWith([1,i])}})},fail:function(i){null!=t&&t.runWith([1,i])}})},c.onClearCacheRes=function(){var i=b.minClearSize,e=[];for(var n in c.filesListObj)e.push(c.filesListObj[n]);c.sortOn(e,"times",16);for(var t=0,o=1,a=e.length;o<a;o++){var r=e[o];if(i<=t)break;t+=r.size,c.deleteFile("",r.readyUrl)}},c.sortOn=function(i,n,e){return void 0===e&&(e=0),16==e?i.sort(function(i,e){return i[n]-e[n]}):18==e?i.sort(function(i,e){return e[n]-i[n]}):i.sort(function(i,e){return i[n]-e[n]})},c.getFileNativePath=function(i){return laya.bd.mini.MiniFileMgr.fileNativeDir+"/"+i},c.deleteFile=function(t,o,a,r,l){void 0===o&&(o=""),void 0===r&&(r=""),void 0===l&&(l=0);var i=c.getFileInfo(o),e=c.getFileNativePath(i.md5);c.fs.unlink({filePath:e,success:function(i){var e=""!=t;if(""!=t){var n=c.getFileNativePath(t);c.fs.copyFile({srcPath:t,destPath:n,success:function(i){c.onSaveFile(o,t,e,r,a,i.size)},fail:function(i){null!=a&&a.runWith([1,i])}})}else c.onSaveFile(o,t,e,r,a,l)},fail:function(i){}})},c.deleteAll=function(){var i=[];for(var e in c.filesListObj)i.push(c.filesListObj[e]);for(var n=1,t=i.length;n<t;n++){var o=i[n];c.deleteFile("",o.readyUrl)}},c.onSaveFile=function(i,e,n,t,o,a){void 0===n&&(n=!0),void 0===t&&(t=""),void 0===a&&(a=0);var r=i;if(null==c.filesListObj.fileUsedSize&&(c.filesListObj.fileUsedSize=0),n){c.getFileNativePath(e);c.filesListObj[r]={md5:e,readyUrl:i,size:a,times:d.now(),encoding:t},c.filesListObj.fileUsedSize=parseInt(c.filesListObj.fileUsedSize)+a,c.writeFilesList(r,JSON.stringify(c.filesListObj),!0),null!=o&&o.runWith([0])}else if(c.filesListObj[r]){var l=parseInt(c.filesListObj[r].size);c.filesListObj.fileUsedSize=parseInt(c.filesListObj.fileUsedSize)-l,delete c.filesListObj[r],c.writeFilesList(r,JSON.stringify(c.filesListObj),!1),null!=o&&o.runWith([0])}},c.writeFilesList=function(i,e,n){var t=c.fileNativeDir+"/"+c.fileListName;c.fs.writeFile({filePath:t,encoding:"utf8",data:e,success:function(i){},fail:function(i){}}),!b.isZiYu&&b.isPosMsgYu&&b.window.swan.postMessage({url:i,data:c.filesListObj[i],isLoad:"filenative",isAdd:n})},c.getCacheUseSize=function(){return c.filesListObj&&c.filesListObj.fileUsedSize?c.filesListObj.fileUsedSize:0},c.existDir=function(i,e){c.fs.mkdir({dirPath:i,success:function(i){null!=e&&e.runWith([0,{data:JSON.stringify({})}])},fail:function(i){-1!=i.errMsg.indexOf("file already exists")?c.readSync(c.fileListName,"utf8",e):null!=e&&e.runWith([1,i])}})},c.readSync=function(i,e,n,t){void 0===e&&(e="ascill"),void 0===t&&(t="");var o,a=c.getFileNativePath(i);try{o=c.fs.readFileSync(a,e),null!=n&&n.runWith([0,{data:o}])}catch(i){null!=n&&n.runWith([1])}},c.setNativeFileDir=function(i){c.fileNativeDir=b.window.swan.env.USER_DATA_PATH+i},c.filesListObj={},c.fileNativeDir=null,c.fileListName="layaairfiles.txt",c.ziyuFileData={},c.ziyuFileTextureData={},c.loadPath="",c.DESCENDING=2,c.NUMERIC=16,e(c,["fs",function(){return this.fs=b.window.swan.getFileSystemManager()},"wxdown",function(){return this.wxdown=b.window.swan.downloadFile}]),c}(),v=function(){function c(){}return r(c,"laya.bd.mini.MiniImage",null,"MiniImage$1"),c.prototype._loadImage=function(i){var e=this;if(b.isZiYu)c.onCreateImage(i,e,!0);else{var n=!1;if(F.isLocalNativeFile(i)){if(-1!=i.indexOf("http://")||-1!=i.indexOf("https://"))if(""!=F.loadPath)i=i.split(F.loadPath)[1];else{var t=""!=y.rootPath?y.rootPath:y.basePath,o=i;""!=t&&(i=i.split(t)[1]),i||(i=o)}if(b.subNativeFiles&&0==b.subNativeheads.length)for(var a in b.subNativeFiles){var r=b.subNativeFiles[a];b.subNativeheads=b.subNativeheads.concat(r);for(var l=0;l<r.length;l++)b.subMaps[r[l]]=a+"/"+r[l]}if(b.subNativeFiles&&-1!=i.indexOf("/")){var s=i.split("/")[0]+"/";if(s&&-1!=b.subNativeheads.indexOf(s)){var u=b.subMaps[s];i=i.replace(s,u)}}}else n=!0,i=y.formatURL(i);F.getFileInfo(i)?c.onCreateImage(i,e,!n):-1!=i.indexOf("http://")||-1!=i.indexOf("https://")?b.isZiYu?c.onCreateImage(i,e,!0):F.downOtherFiles(i,new g(c,c.onDownImgCallBack,[i,e]),i):c.onCreateImage(i,e,!0)}},c.onDownImgCallBack=function(i,e,n,t){void 0===t&&(t=""),n?e.onError(null):c.onCreateImage(i,e,!1,t)},c.onCreateImage=function(i,e,n,t){var o,a;if(void 0===n&&(n=!1),void 0===t&&(t=""),b.autoCacheFile)if(n)o=i;else if(""!=t)o=t;else{var r=F.getFileInfo(i).md5;o=F.getFileNativePath(r)}else o=n?i:t;function l(){var i=e._imgCache[o];i&&(i.onload=null,i.onerror=null,delete e._imgCache[o])}null==e._imgCache&&(e._imgCache={});var s=function(){l(),e.event("error","Load image failed")};if("nativeimage"==e._type){var u=function(){l(),e._url=y.formatURL(e._url),e.onLoaded(a)};(a=new d.window.Image).crossOrigin="",a.onload=u,a.onerror=s,a.src=o,e._imgCache[o]=a}else{var c=new d.window.Image;u=function(){e._url=y.formatURL(e._url),(a=f.create(c.width,c.height)).loadImageSource(c,!0),a._setCreateURL(o),l(),e.onLoaded(a)},c.crossOrigin="",c.onload=u,c.onerror=s,c.src=o,e._imgCache[o]=c}},c}(),m=function(){function n(){}return r(n,"laya.bd.mini.MiniInput",null,"MiniInput$1"),n._createInputElement=function(){l._initInput(l.area=d.createElement("textarea")),l._initInput(l.input=d.createElement("input")),l.inputContainer=d.createElement("div"),l.inputContainer.style.position="absolute",l.inputContainer.style.zIndex=1e5,d.container.appendChild(l.inputContainer),l.inputContainer.setPos=function(i,e){l.inputContainer.style.left=i+"px",l.inputContainer.style.top=e+"px"},a.stage.on("resize",null,n._onStageResize),b.window.swan.onWindowResize&&b.window.swan.onWindowResize(function(i){o.dispatchEvent&&o.dispatchEvent("resize")}),p._soundClass=S,p._musicClass=S;var i=b.systemInfo.model,e=b.systemInfo.system;-1!=i.indexOf("iPhone")&&(d.onIPhone=!0,d.onIOS=!0,d.onIPad=!0,d.onAndroid=!1),-1==e.indexOf("Android")&&-1==e.indexOf("Adr")||(d.onAndroid=!0,d.onIPhone=!1,d.onIOS=!1,d.onIPad=!1)},n._onStageResize=function(){a.stage._canvasTransform.identity().scale(d.width/u.canvas.width/d.pixelRatio,d.height/u.canvas.height/d.pixelRatio)},n.wxinputFocus=function(i){var n=l.inputElement.target;n&&!n.editable||(b.window.swan.offKeyboardConfirm(),b.window.swan.offKeyboardInput(),b.window.swan.showKeyboard({defaultValue:n.text,maxLength:n.maxChars,multiple:n.multiline,confirmHold:!0,confirmType:"done",success:function(i){},fail:function(i){}}),b.window.swan.onKeyboardConfirm(function(i){var e=i?i.value:"";n._restrictPattern&&(e=e.replace(/\u2006|\x27/g,""),n._restrictPattern.test(e)&&(e=e.replace(n._restrictPattern,""))),n.text=e,n.event("input"),laya.bd.mini.MiniInput.inputEnter()}),b.window.swan.onKeyboardInput(function(i){var e=i?i.value:"";n.multiline||-1==e.indexOf("\n")?(n._restrictPattern&&(e=e.replace(/\u2006|\x27/g,""),n._restrictPattern.test(e)&&(e=e.replace(n._restrictPattern,""))),n.text=e,n.event("input")):laya.bd.mini.MiniInput.inputEnter()}))},n.inputEnter=function(){l.inputElement.target.focus=!1},n.wxinputblur=function(){n.hideKeyboard()},n.hideKeyboard=function(){b.window.swan.offKeyboardConfirm(),b.window.swan.offKeyboardInput(),b.window.swan.hideKeyboard({success:function(i){console.log("隐藏键盘")},fail:function(i){console.log("隐藏键盘出错:"+(i?i.errMsg:""))}})},n}(),w=function(){function n(){}return r(n,"laya.bd.mini.MiniLocalStorage",null,"MiniLocalStorage$1"),n.__init__=function(){n.items=n},n.setItem=function(i,e){b.window.swan.setStorageSync(i,e)},n.getItem=function(i){return b.window.swan.getStorageSync(i)},n.setJSON=function(i,e){n.setItem(i,e)},n.getJSON=function(i){return n.getItem(i)},n.removeItem=function(i){b.window.swan.removeStorageSync(i)},n.clear=function(){b.window.swan.clearStorageSync()},n.getStorageInfoSync=function(){try{var i=b.window.swan.getStorageInfoSync();return console.log(i.keys),console.log(i.currentSize),console.log(i.limitSize),i}catch(i){}return null},n.support=!0,n.items=null,n}(),b=function(){function t(){}return r(t,"laya.bd.mini.BMiniAdapter"),t.getJson=function(i){return JSON.parse(i)},t.enable=function(){t.init()},t.init=function(i,e){void 0===i&&(i=!1),void 0===e&&(e=!1),t._inited||(t._inited=!0,(t.window=o).navigator.userAgent.indexOf("SwanGame")<0||(t.isZiYu=e,t.isPosMsgYu=i,t.EnvConfig={},t.isZiYu||(F.setNativeFileDir("/layaairGame"),F.existDir(F.fileNativeDir,g.create(t,t.onMkdirCallBack))),t.systemInfo=laya.bd.mini.BMiniAdapter.window.swan.getSystemInfoSync(),t.window.focus=function(){},a._getUrlPath=function(){},t.window.logtime=function(i){},t.window.alertTimeLog=function(i){},t.window.resetShareInfo=function(){},t.window.CanvasRenderingContext2D=function(){},t.window.CanvasRenderingContext2D.prototype=laya.bd.mini.BMiniAdapter.window.swan.createCanvas().getContext("2d").__proto__,t.window.document.body.appendChild=function(){},t.EnvConfig.pixelRatioInt=0,d._pixelRatio=t.pixelRatio(),t._preCreateElement=d.createElement,d.createElement=t.createElement,c.createShaderCondition=t.createShaderCondition,C.parseXMLFromString=t.parseXMLFromString,l._createInputElement=m._createInputElement,t.EnvConfig.load=_.prototype.load,_.prototype.load=L.prototype.load,_.prototype._loadImage=v.prototype._loadImage,w.__init__(),s._baseClass=w))},t.getUrlEncode=function(i,e){return"arraybuffer"==e?"":"utf8"},t.downLoadFile=function(i,e,n,t){void 0===e&&(e=""),void 0===t&&(t="utf8"),F.getFileInfo(i)?null!=n&&n.runWith([0]):F.downLoadFile(i,e,n,t)},t.remove=function(i,e){F.deleteFile("",i,e,"",0)},t.removeAll=function(){F.deleteAll()},t.hasNativeFile=function(i){return F.isLocalNativeFile(i)},t.getFileInfo=function(i){return F.getFileInfo(i)},t.getFileList=function(){return F.filesListObj},t.exitMiniProgram=function(){laya.bd.mini.BMiniAdapter.window.swan.exitMiniProgram()},t.onMkdirCallBack=function(i,e){i||(F.filesListObj=JSON.parse(e.data))},t.pixelRatio=function(){if(!t.EnvConfig.pixelRatioInt)try{return t.EnvConfig.pixelRatioInt=t.systemInfo.pixelRatio,t.systemInfo.pixelRatio}catch(i){}return t.EnvConfig.pixelRatioInt},t.createElement=function(i){var e;if("canvas"==i)return 1==t.idx?t.isZiYu?(e=sharedCanvas).style={}:e=o.canvas:e=laya.bd.mini.BMiniAdapter.window.swan.createCanvas(),t.idx++,e;if("textarea"==i||"input"==i)return t.onCreateInput(i);if("div"!=i)return t._preCreateElement(i);var n=t._preCreateElement(i);return n.contains=function(i){return null},n.removeChild=function(i){},n},t.onCreateInput=function(i){var e=t._preCreateElement(i);return e.focus=m.wxinputFocus,e.blur=m.wxinputblur,e.style={},e.value=0,e.parentElement={},e.placeholder={},e.type={},e.setColor=function(i){},e.setType=function(i){},e.setFontFace=function(i){},e.addEventListener=function(i){},e.contains=function(i){return null},e.removeChild=function(i){},e},t.createShaderCondition=function(i){var e=this;return function(){return e[i.replace("this.","")]}},t.EnvConfig=null,t.window=null,t._preCreateElement=null,t._inited=!1,t.systemInfo=null,t.isZiYu=!1,t.isPosMsgYu=!1,t.autoCacheFile=!0,t.minClearSize=5242880,t.subNativeFiles=null,t.subNativeheads=[],t.subMaps=[],t.AutoCacheDownFile=!1,t.parseXMLFromString=function(i){var e;i=i.replace(/>\s+</g,"><");try{e=(new o.Parser.DOMParser).parseFromString(i,"text/xml")}catch(i){throw"需要引入xml解析库文件"}return e},t.idx=1,e(t,["nativefiles",function(){return this.nativefiles=["layaNativeDir","wxlocal"]}]),t}(),L=(function(){function o(){}r(o,"laya.bd.mini.MiniLocation",null,"MiniLocation$1"),o.__init__=function(){b.window.navigator.geolocation.getCurrentPosition=o.getCurrentPosition,b.window.navigator.geolocation.watchPosition=o.watchPosition,b.window.navigator.geolocation.clearWatch=o.clearWatch},o.getCurrentPosition=function(e,i,n){var t;(t={success:function(i){null!=e&&e(i)}}).fail=i,b.window.swan.getLocation(t)},o.watchPosition=function(i,e,n){var t;return o._curID++,(t={}).success=i,t.error=e,o._watchDic[o._curID]=t,a.systemTimer.loop(1e3,null,o._myLoop),o._curID},o.clearWatch=function(i){delete o._watchDic[i],o._hasWatch()||a.systemTimer.clear(null,o._myLoop)},o._hasWatch=function(){var i;for(i in o._watchDic)if(o._watchDic[i])return!0;return!1},o._myLoop=function(){o.getCurrentPosition(o._mySuccess,o._myError)},o._mySuccess=function(i){var e,n={};for(e in n.coords=i,n.timestamp=d.now(),o._watchDic)o._watchDic[e].success&&o._watchDic[e].success(n)},o._myError=function(i){var e;for(e in o._watchDic)o._watchDic[e].error&&o._watchDic[e].error(i)},o._watchDic={},o._curID=0}(),function(o){function a(){a.__super.call(this)}r(a,"laya.bd.mini.MiniAccelerator",o,"MiniAccelerator$1");var i=a.prototype;i.on=function(i,e,n,t){return o.prototype.on.call(this,i,e,n,t),a.startListen(this.onDeviceOrientationChange),this},i.off=function(i,e,n,t){return void 0===t&&(t=!1),this.hasListener(i)||a.stopListen(),o.prototype.off.call(this,i,e,n,t)},a.__init__=function(){try{var i;if(!(i=laya.device.motion.Accelerator))return;i.prototype.on=a.prototype.on,i.prototype.off=a.prototype.off}catch(i){}},a.startListen=function(i){if(a._callBack=i,!a._isListening){a._isListening=!0;try{b.window.swan.onAccelerometerChange(laya.bd.mini.MiniAccelerator.onAccelerometerChange)}catch(i){}}},a.stopListen=function(){a._isListening=!1;try{b.window.swan.stopAccelerometer({})}catch(i){}},a.onAccelerometerChange=function(i){var e;(e={}).acceleration=i,e.accelerationIncludingGravity=i,e.rotationRate={},null!=a._callBack&&a._callBack(e)},a._isListening=!1,a._callBack=null}(n),function(i){function w(){w.__super.call(this)}return r(w,"laya.bd.mini.MiniLoader",n,"MiniLoader$1"),w.prototype.load=function(i,e,n,t,o){void 0===n&&(n=!0),void 0===o&&(o=!1);var a=this;if(a._url=i,0===(i=y.customFormat(i)).indexOf("data:image")?a._type=e="image":a._type=e||(e=_.getTypeFromUrl(a._url)),a._cache=n,a._data=null,!o&&_.loadedMap[y.formatURL(i)])return a._data=_.loadedMap[y.formatURL(i)],this.event("progress",1),void this.event("complete",a._data);if(null!=_.parserMap[e])return a._customParse=!0,void(_.parserMap[e]instanceof laya.utils.Handler?_.parserMap[e].runWith(this):_.parserMap[e].call(null,this));var r=b.getUrlEncode(i,e),l=C.getFileExtension(i);if(-1!=w._fileTypeArr.indexOf(l))b.EnvConfig.load.call(this,i,e,n,t,o);else{if(b.isZiYu&&F.ziyuFileData[i]){var s=F.ziyuFileData[i];return void a.onLoaded(s)}if(F.getFileInfo(i)){var u=F.getFileInfo(i);u.encoding=null==u.encoding?"utf8":u.encoding,F.readFile(i,u.encoding,new g(w,w.onReadNativeCallBack,[r,i,e,n,t,o,a]),i)}else{if(F.isLocalNativeFile(i)){if(b.subNativeFiles&&0==b.subNativeheads.length)for(var c in b.subNativeFiles){var d=b.subNativeFiles[c];b.subNativeheads=b.subNativeheads.concat(d);for(var f=0;f<d.length;f++)b.subMaps[d[f]]=c+"/"+d[f]}if(b.subNativeFiles&&-1!=i.indexOf("/")){var h=i.split("/")[0]+"/";if(h&&-1!=b.subNativeheads.indexOf(h)){var p=b.subMaps[h];i=i.replace(h,p)}}var v=""!=y.rootPath?y.rootPath:y.basePath,m=i;return""!=v&&(i=i.split(v)[1]),i||(i=m),void F.read(i,r,new g(w,w.onReadNativeCallBack,[r,i,e,n,t,o,a]))}-1!=(i=y.formatURL(i)).indexOf("http://")||-1!=i.indexOf("https://")&&!b.AutoCacheDownFile?b.EnvConfig.load.call(a,i,e,n,t,o):F.readFile(i,r,new g(w,w.onReadNativeCallBack,[r,i,e,n,t,o,a]),i)}}},w.onReadNativeCallBack=function(i,e,n,t,o,a,r,l,s){var u;(void 0===t&&(t=!0),void 0===a&&(a=!1),void 0===l&&(l=0),l)?1==l&&b.EnvConfig.load.call(r,e,n,t,o,a):(u="json"==n||"atlas"==n||"prefab"==n?b.getJson(s.data):"xml"==n?C.parseXMLFromString(s.data):s.data,!b.isZiYu&&b.isPosMsgYu&&"arraybuffer"!=n&&b.window.swan.postMessage({url:e,data:u,isLoad:"filedata"}),r.onLoaded(u))},e(w,["_fileTypeArr",function(){return this._fileTypeArr=["png","jpg","bmp","jpeg","gif"]}]),w}()),S=function(i){function a(){this._sound=null,this.url=null,this.loaded=!1,this.readyUrl=null,a.__super.call(this)}r(a,"laya.bd.mini.MiniSound",n,"MiniSound$1");var e=a.prototype;return e.load=function(i){if(i=y.formatURL(i),this.url=i,this.readyUrl=i,a._audioCache[this.readyUrl])this.event("complete");else if(b.autoCacheFile&&F.getFileInfo(i))this.onDownLoadCallBack(i,0);else if(b.autoCacheFile)if(F.isLocalNativeFile(i)){var e=""!=y.rootPath?y.rootPath:y.basePath,n=i;""!=e&&(i=i.split(e)[1]),i||(i=n),this.onDownLoadCallBack(i,0)}else F.downOtherFiles(i,g.create(this,this.onDownLoadCallBack,[i]),i);else this.onDownLoadCallBack(i,0)},e.onDownLoadCallBack=function(i,e){if(e)this.event("error");else{var n;if(b.autoCacheFile){if(F.isLocalNativeFile(i))n=i;else{var t=F.getFileInfo(i).md5;n=F.getFileNativePath(t)}this._sound=a._createSound(),this._sound.src=this.url=n}else this._sound=a._createSound(),this._sound.src=i;this._sound.onCanplay(a.bindToThis(this.onCanPlay,this)),this._sound.onError(a.bindToThis(this.onError,this))}},e.onError=function(i){try{console.log("-----1---------------minisound-----id:"+a._id),console.log(i)}catch(i){console.log("-----2---------------minisound-----id:"+a._id),console.log(i)}this.event("error"),this._sound.offError(null)},e.onCanPlay=function(){this.loaded=!0,this.event("complete"),this._sound.offCanplay(null)},e.play=function(i,e){var n;if(void 0===i&&(i=0),void 0===e&&(e=0),n=this.url==p._bgMusic?(a._musicAudio||(a._musicAudio=a._createSound()),a._musicAudio):a._audioCache[this.readyUrl]?a._audioCache[this.readyUrl]._sound:a._createSound(),b.autoCacheFile&&F.getFileInfo(this.url)){var t=F.getFileInfo(this.url).md5;n.src=this.url=F.getFileNativePath(t)}else n.src=this.url;if(!n)return null;var o=new I(n,this);return o.url=this.url,o.loops=e,o.loop=0===e,o.startTime=i,o.play(),p.addChannel(o),o},e.dispose=function(){var i=a._audioCache[this.readyUrl];i&&(i.src="",i._sound&&(i._sound.destroy(),i._sound=null,i=null),delete a._audioCache[this.readyUrl])},t(0,e,"duration",function(){return this._sound.duration}),a._createSound=function(){return a._id++,b.window.swan.createInnerAudioContext()},a.bindToThis=function(i,e){return i.bind(e)},a._musicAudio=null,a._id=0,a._audioCache={},a}(),I=function(i){function n(i,e){this._audio=null,this._onEnd=null,this._miniSound=null,n.__super.call(this),this._audio=i,this._miniSound=e,this._onEnd=n.bindToThis(this.__onEnd,this),i.onEnded(this._onEnd)}r(n,"laya.bd.mini.MiniSoundChannel",h,"MiniSoundChannel$1");var e=n.prototype;return e.__onEnd=function(){if(S._audioCache[this.url]=this._miniSound,1==this.loops)return this.completeHandler&&(a.systemTimer.once(10,this,this.__runComplete,[this.completeHandler],!1),this.completeHandler=null),this.stop(),void this.event("complete");0<this.loops&&this.loops--,this.startTime=0,this.play()},e.play=function(){this.isStopped=!1,p.addChannel(this),this._audio.play()},e.stop=function(){this.isStopped=!0,p.removeChannel(this),this.completeHandler=null,this._audio&&(this._audio.pause(),this._audio.offEnded(null),this._miniSound.dispose(),this._audio=null,this._miniSound=null,this._onEnd=null)},e.pause=function(){this.isStopped=!0,this._audio.pause()},e.resume=function(){this._audio&&(this.isStopped=!1,p.addChannel(this),this._audio.play())},t(0,e,"autoplay",function(){return this._audio.autoplay},function(i){this._audio.autoplay=i}),t(0,e,"position",function(){return this._audio?this._audio.currentTime:0}),t(0,e,"duration",function(){return this._audio?this._audio.duration:0}),t(0,e,"loop",function(){return this._audio.loop},function(i){this._audio.loop=i}),t(0,e,"volume",function(){return this._audio?this._audio.volume:1},function(i){this._audio&&(this._audio.volume=i)}),n.bindToThis=function(i,e){return i.bind(e)},n}()},1001);