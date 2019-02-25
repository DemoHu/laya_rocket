/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖页面
 */
import { ui } from "../ui/layaMaxUI";
import { get } from "../js/http";
import utils from "../js/utils";
import api from "../js/api";
import { Tabbar } from "../view/Tabbar";
import { GameModel } from "../js/GameModel";

 export default class grandPrix extends ui.grandPrixUI {
     constructor(){
         super()
         this.rankPrizeHelp.on(Laya.Event.CLICK,this,this.openRankPrizeHelp)
         this.btn_history.on(Laya.Event.CLICK,this,this.Btnhistory)
     }

     onEnable(){
        this.getRankToday()
        // 监视火箭数据变动
        GameModel.getInstance().on('getRocketData',this,(res:any) => {
            this.bonus.text = `${utils.toDecimal(res.potMoney,2)}` 
            utils.countDown(res.countDown,((time)=>{
                this.CountDown.text = time
            }))
        })
     }

     /**获取大奖信息 */
    private getRankToday(){
        api.getRankToday().then((res:any)=>{
            this.bonus.text = `${utils.toDecimal(res.potMoney,2)}` 
            utils.countDown(res.countDown,((time)=>{
                this.CountDown.text = time
            }))
            if (res.list.length === 0) {
                this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {
                this.box1.visible = true;
                this.alone1.text = `独得 ${utils.toDecimal(res.list.list1.dividmoney,2)} USDT`
                this.Proportion1.text = `占奖池${res.list.list1.percent}`
                this.prixList1.array = res.list.list1.data
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                this.box2.visible = true;
                this.alone2.text = `每人 ${utils.toDecimal(res.list.list2.dividmoney/4,2)} USDT`
                this.Proportion2.text = `占奖池${res.list.list2.percent}`
                this.prixList2.array = res.list.list2.data
            }
            // 5-15名
            if (res.list.list3.data.length > 0) {
                this.box3.visible = true;
                this.alone3.text = `每人 ${utils.toDecimal(res.list.list3.dividmoney/10,2)} USDT`
                this.Proportion3.text = `占奖池${res.list.list3.percent}`
                this.prixList3.array = res.list.list3.data
            }
            //未登录则不显示个人排名
            if (res.list.self.userId) {
                this.myRankBox.visible = true;
                this.myranking.text = res.list.self.rank > 15 ? '15+' : `${res.list.self.rank}`;
                this.avatar.skin = res.list.self.avatar;
                this.nickName.text = res.list.self.nickName;
                this.uid.text = res.list.self.userId;
                this.volume.text = `${utils.toDecimal(res.list.self.consum,2)} USDT`
            }
        }).catch((err:any)=>{
            console.log(err.message);
        })
    }

    private Btnhistory(){
        Tabbar.getInstance().openScene('priHistoryScene.scene')
    }

    /**说明 */
    private openRankPrizeHelp(){
        window.location.href = 'https://m.xyhj.io/rankPrizeHelp.html';
    }
 } 