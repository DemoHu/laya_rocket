/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:44:02
 * @modify date 2019-02-19 17:44:02
 * @desc 购买成功后的提示框脚本
 */
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