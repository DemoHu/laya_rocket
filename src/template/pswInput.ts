/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:23
 * @modify date 2019-02-19 17:49:23
 * @desc 交易密码输入弹窗脚本
 */
import { ui } from '../ui/layaMaxUI'
import TipsDiaLog from './tipDialog';
import { Toast } from '../view/Toasts';
import Guessing from '../script/Guessing';
import api from '../js/api';

export default class IptPswDom extends ui.template.InputPwdDialogUI {

    private period:string = '';//期号
    private codeList:string = '';//购买号码
    private isEnter:boolean = false; //函数节流

    constructor() {
        super()
    }
    onEnable(){
        this.btnClose.on(Laya.Event.CLICK,this,this.closeFunc)
        this.IptPsw.on(Laya.Event.FOCUS,this,this.onFocus)
        this.IptPsw.on(Laya.Event.BLUR,this,this.onBLUR)
        this.IptPsw.on(Laya.Event.KEY_UP,this,this.onChange)
    }

    /**获取传递的参数 */
    setData(data:any) {
        this.period = data.period;
        this.codeList = data.codeList;
    }

    /**输入内容改变 */
    private onChange(){
        if (!this.isEnter && this.IptPsw.text.length === 6) {
            this.tradeBuy()
        }
    }

    /**购买 */
    private tradeBuy(){
        this.isEnter = true;
        api.postTradeBuy(this.period,this.codeList,this.IptPsw.text).then((res:any)=>{
            this.isEnter = false;
            this.closeFunc();

            this.event("refreshData");//刷新数据列表
            // 购买成功弹出对话框
            let tipsDialog:TipsDiaLog = new TipsDiaLog()
            tipsDialog.popup()
        }).catch((err:any)=>{
            this.isEnter = false;
            this.closeFunc();

            Toast.show(err.message)
        })
    }

    /**关闭密码框 */
    private closeFunc(){
        this.close();
    }
    /**输入框获得焦点 */
    private onFocus(){
        this.top = 150;
    }
    /**输入框获得焦点 */
    private onBLUR(){
       this.top = 440;
    }
}