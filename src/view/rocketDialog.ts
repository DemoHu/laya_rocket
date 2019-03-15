import { ui } from "../ui/layaMaxUI";
import { GameModel } from "../js/GameModel";

export default class RocketDialog extends ui.template.showRocketUI {
    private static _dlg: RocketDialog;

    static get dlg(): RocketDialog {
        if (!this._dlg) {
            this._dlg = new RocketDialog();
            this._dlg.x = 0;
            this._dlg.y = 0;
            this._dlg.isPopupCenter = false;
        }
        return this._dlg;
    }
    
    onEnable(){
       this.btn_close.on(Laya.Event.CLICK,this,this.closeDialog)
       this.ani1.play(0,false)
       this.ani2.play(0,false)
    }
    static init(){
        GameModel.getInstance().on('getRocketRanking',this,(res:any)=>{
            console.log(res);
            this.dlg.popup(false, false);
            this.dlg.ranking.array = res;
        })
    }

    closeDialog(){
        this.close()
    }

}