/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:16
 * @modify date 2019-02-19 17:48:16
 * @desc 首页脚本
 */
import { ui } from "../ui/layaMaxUI";
import { Toast } from "../view/Toast";
import { GameModel } from "../js/GameModel";
import utils from '../js/utils'
import api from "../js/api";

import { post } from '../js/http';
import { Socket } from "../js/socket";
import { Tabbar } from "../view/Tabbar";
// import rechargeDialog from '../template/rechargeDialog';
import screenUtils from "../js/screenUtils";


export default class Home extends ui.homeUI {

    // private rechargeDialog: rechargeDialog;//充值弹出

    constructor() {
        super()
        this.rechargeBox.on(Laya.Event.CLICK, this, this.btnRechargeFunc);
        this.buyHelp.on(Laya.Event.CLICK, this, this.openBuyHelp)
        this.putin.on(Laya.Event.CLICK, this, this.putInFunc)
        this.go_center.on(Laya.Event.CLICK, this, this.goCenter)
    }
    onEnable(): void {
        this.getUserInfo()
        this.rankToday()
        this.getGoodsList()

        // 监视火箭数据变动
        GameModel.getInstance().on('getRocketData', this, (res: any) => {
            this.rocketAmount.text = `${utils.toDecimal(res.potMoney, 2)}`
            utils.countDown(res.countDown, ((time) => {
                this.rocketCountDown.text = time
            }))
        })
        // 是否开奖了，开奖刷新商品列表
        GameModel.getInstance().on('isToggle', this, (res: any) => {
            if (screenUtils.getScreen().name  === 'home') {
                this.getGoodsList()
            }
        })

    }


    /**充值 */
    private btnRechargeFunc(): void {
        window.location.href = `https://${document.domain}/#/main_Page?show=recharge`
        // Toast.show('点击充值')
        // this.rechargeDialog = new rechargeDialog();
        // this.rechargeDialog.y = Laya.stage.height - this.rechargeDialog.height;
        // this.rechargeDialog.popupEffect = Laya.Handler.create(this, this.rechargeDialogPopupFun);
        // this.rechargeDialog.closeEffect = Laya.Handler.create(this, this.rechargeDialogCloseFun);
        // this.rechargeDialog.popup();
    }
    /**空投 */
    private putInFunc() {
        // Tabbar.getInstance().openScene('xctj.scene')
        Toast.show('暂未开放，敬请期待')
    }

    /**获取个人信息 */
    private getUserInfo() {
        api.getUserInfo().then((res: any) => {
            this.nickName.text = res.userInfo.nickName
            this.myAmount.text = `${utils.toDecimal(res.userInfo.money, 2)}`
            this.avatar.skin = res.userInfo.avatar;
        }).catch((err: any) => {
           
        })
    }

    /**今日大奖池 */
    private rankToday() {
        api.getRankToday().then((res: any) => {
            this.rocketAmount.text = `${utils.toDecimal(res.potMoney, 2)}`
            utils.countDown(res.countDown, ((time) => {
                this.rocketCountDown.text = time
            }))
        }).catch((err: any) => {
            console.log(err.message);
        })
    }

    /**获取首页商品列表 */
    private getGoodsList() {
        api.getGoodsList().then((res: any) => {
            this.list.repeatX = res.list.length;
            this.list.array = res.list;
        }).catch((err: any) => {
            console.log(err.message);
        })
    }

    /**玩法介绍 */
    private openBuyHelp() {
        window.location.href = location.origin + '/#/origin/zh/buyHelp';
    }

    private goCenter() {
        window.location.href = `https://${document.domain}/#/main_Page`
    }

    /**弹出充值的效果 */
    // rechargeDialogPopupFun(dialog: Laya.Dialog) {
    //     dialog.scale(1, 1);
    //     dialog._effectTween = Laya.Tween.from(dialog,
    //         { x: 0, y: Laya.stage.height + dialog.height },
    //         300,
    //         Laya.Ease.linearNone,
    //         Laya.Handler.create(Laya.Dialog.manager, Laya.Dialog.manager.doOpen, [dialog]), 0, false, false);
    // }
    /**关闭充值的效果 */
    // rechargeDialogCloseFun(dialog: Laya.Dialog) {
    //     dialog._effectTween = Laya.Tween.to(dialog,
    //         { x: 0, y: Laya.stage.height + dialog.height },
    //         300,
    //         Laya.Ease.linearNone,
    //         Laya.Handler.create(Laya.Dialog.manager, Laya.Dialog.manager.doClose, [dialog]), 0, false, false);
    // }
}