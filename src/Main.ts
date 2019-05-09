import GameConfig from "./GameConfig";
import RocketDialog from "./view/rocketDialog";
import { loadingResList , loadingResList1 } from './loadingResList'
import { Socket } from "./js/socket";
import LoadingScene from "./script/loadingScene";

class Main {
	constructor() {
		 // 在微信中，如果跳转到游戏之前页面修改了innerWdth和innerHeight，会导致宽高计算错误
        const win: any = window;
        win.innerWidth = win.outerWidth;
        win.innerHeight = win.outerHeight;
		//根据IDE设置初始化引擎		
		if (window["Laya3D"]) Laya3D.init(GameConfig.width, GameConfig.height);
		else Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
		Laya["Physics"] && Laya["Physics"].enable();
		Laya["DebugPanel"] && Laya["DebugPanel"].enable();
		Laya.stage.scaleMode = GameConfig.scaleMode;
		Laya.stage.screenMode = GameConfig.screenMode;
		Laya.stage.bgColor = '#4955dd';
		//兼容微信不支持加载scene后缀场景
		Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;

		//打开调试面板（通过IDE设置调试模式，或者url地址增加debug=true参数，均可打开调试面板）
		if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true") Laya.enableDebugPanel();
		if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"]) Laya["PhysicsDebugDraw"].enable();
		if (GameConfig.stat) Laya.Stat.show();
		Laya.alertGlobalError = true;

		//自定义事件
		RocketDialog.init(); //火箭开奖效果

		//激活资源版本控制，version.json由IDE发布功能自动生成，如果没有也不影响后续流程
		Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
	}

	onVersionLoaded(): void {
		//激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
		Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
	}

	onConfigLoaded(): void {
		// 连接websocket
		Socket.createSocket()
		Laya.Scene.open(GameConfig.startScene,true,null,Laya.Handler.create(this,this.onLoadingSceneOpened))
	}
	onLoadingSceneOpened(loadingScene:LoadingScene): void {
		//预加载
        Laya.loader.load(loadingResList, 
			Laya.Handler.create(this, this.onGameResLoaded),
			Laya.Handler.create(this,this.onGameResLoadProgress,[loadingScene],false));
	}

	onGameResLoadProgress(loadingScene:LoadingScene,progress:number){
		console.log(loadingScene);
		
		loadingScene.setProgress(progress)
	}

	onGameResLoaded():void {
		//加载IDE指定的场景
		Laya.Scene.open('home.scene',true,null,Laya.Handler.create(this,(()=>{
			Laya.loader.load(loadingResList1);
		})));
	}
}
//激活启动类
new Main();
