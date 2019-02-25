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
    private AllCodeList:object[] = [];//号码列表
    constructor() {
        super()
    }
    onEnable(){
        this.btnContinue.on(Laya.Event.CLICK,this,this.closeFunc)
        this.btnViewRecord.on(Laya.Event.CLICK,this,this.viewRecordFunc)
        
    }

    /**获取传递的参数 */
    setData(data:any) {
        this.AllCodeList = data.AllCodeList;
    }

    /**关闭密码框 */
    private closeFunc(){

        this.close();
        // 若全部被购买，则回到首页重新选择购买期号
        let count:number = 0;
        this.AllCodeList.forEach((v:any) => {
            if (v.buyerId !== '0') {
                count = count + 1;
            }
        });
        if (count === this.AllCodeList.length) {
            Tabbar.getInstance().openScene('home.scene')
        }
    }

    // 查看记录
    private viewRecordFunc(){
        this.close();
        Tabbar.getInstance().openScene('record.scene')
    }
}