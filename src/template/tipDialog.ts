import { ui } from "../ui/layaMaxUI";
import { Tabbar } from "../view/Tabbar";

export default class TipsDiaLog extends ui.template.TipsDialogUI {
    constructor() {
        super()
    }
    onEnable(){
        this.btnContinue.on(Laya.Event.CLICK,this,this.closeFunc)
        this.btnViewRecord.on(Laya.Event.CLICK,this,this.viewRecordFunc)
        
    }

    /**关闭密码框 */
    private closeFunc(){
        this.close();
    }
    private viewRecordFunc(){
        this.close();
        Tabbar.getInstance().openScene('record.scene')
    }
}