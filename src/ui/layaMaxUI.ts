/**This class is automatically generated by LayaAirIDE, please do not make any modifications. */
import View=Laya.View;
import Dialog=Laya.Dialog;
import Scene=Laya.Scene;
export module ui {
    export class assistantUI extends Laya.Scene {
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("assistant");
        }
    }
    export class CardUI extends Laya.View {
		public ani1:Laya.FrameAnimation;
		public cardItem:Laya.Image;
		public sceneImg:Laya.Image;
		public amount_label:Laya.Label;
		public current:Laya.Label;
		public speed:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("Card");
        }
    }
    export class grandPrixUI extends Laya.Scene {
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("grandPrix");
        }
    }
    export class guessingUI extends Laya.Scene {
		public unitPrice:Laya.Label;
		public numberList:Laya.List;
		public btn_buy:Laya.Image;
		public btn_select:Laya.View;
		public random_one:Laya.Label;
		public random_before:Laya.Label;
		public random_after:Laya.Label;
		public random_all:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("guessing");
        }
    }
    export class homeUI extends Laya.Scene {
		public put_in:Laya.FrameAnimation;
		public rocket_show:Laya.FrameAnimation;
		public dom_show:Laya.FrameAnimation;
		public tuichu:Laya.Image;
		public btnRecharge:Laya.Image;
		public putin:Laya.Sprite;
		public list:Laya.List;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("home");
        }
    }
    export class recordUI extends Laya.Scene {
		public canyu:Laya.Image;
		public wangqi:Laya.Image;
		public previoousList:Laya.List;
		public joinList:Laya.List;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("record");
        }
    }
    export class TabbarUI extends Laya.View {
		public tab:Laya.Tab;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("Tabbar");
        }
    }
}
export module ui.template {
    export class InputPwdDialogUI extends Laya.Dialog {
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("template/InputPwdDialog");
        }
    }
    export class joinRecordsUI extends Laya.View {
		public noPrize:Laya.Label;
		public prize:Laya.Image;
		public prize_number:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("template/joinRecords");
        }
    }
    export class numberListDOMUI extends Laya.View {
		public bgImg:Laya.Image;
		public index:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("template/numberListDOM");
        }
    }
    export class previousRecordsUI extends Laya.View {
		public number:Laya.Label;
		public lotteryType:Laya.Label;
		public hash:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("template/previousRecords");
        }
    }
    export class ToastUI extends Laya.View {
		public text_label:Laya.Label;
        constructor(){ super()}
        createChildren():void {
            super.createChildren();
            this.loadScene("template/Toast");
        }
    }
}