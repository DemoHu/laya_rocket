/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-27 10:06:18
 * @modify date 2019-02-27 10:06:18
 * @desc 充值提币弹出脚本
 */
import { ui } from '../ui/layaMaxUI'
 
export default class RechargeDialog extends ui.template.rechargeDialogUI {
    constructor(){
        super()
    }

    onEnable(){
        this.btn_quickRecharge.on(Laya.Event.CLICK,this,this.quickRechargeFunc)
        this.btn_withdraw.on(Laya.Event.CLICK,this,this.withdrawFunc)
    }

    /**快捷充值 */
    private quickRechargeFunc(){
        alert('快捷充值')
    }
    /**USDT钱包提币 */
    withdrawFunc(){
        alert('USDT钱包提币')
    }
}

