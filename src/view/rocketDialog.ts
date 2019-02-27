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
       this.ranking.array = [
           {ranking:'01',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'02',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'03',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'04',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'05',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'06',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'07',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'08',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'09',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'10',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'11',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'12',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'13',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'14',nickName:'张三',uid:'123323',amount:'323.32'},
           {ranking:'15',nickName:'张三',uid:'123323',amount:'323.32'}
       ]
    }
    static init(){
        GameModel.getInstance().on('getRocketRanking',this,(res:any)=>{
            console.log('数据变动2');
            this.dlg.popup(false, false);
        })
    }

    closeDialog(){
        this.close()
    }

}