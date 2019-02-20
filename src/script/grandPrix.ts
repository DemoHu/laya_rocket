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

 export default class grandPrix extends ui.grandPrixUI {
     constructor(){
         super()
         this.rankPrizeHelp.on(Laya.Event.CLICK,this,this.openRankPrizeHelp)
     }

     onEnable(){
        this.getRankToday()
     }

     /**获取大奖信息 */
    private getRankToday(){
        api.getRankToday().then((res:any)=>{
            this.bonus.text = `${utils.toDecimal(res.potMoney,2)}` 
            utils.countDown(res.countDown,((time)=>{
                this.CountDown.text = time
            }))
            //未登录则不显示个人排名
            if (res.list.self.userId) {
                this.myRankBox.visible = true;
                this.myranking.text = res.list.self.rank > 15 ? '15+' : `${res.list.self.rank}`;
                this.avatar.skin = res.list.self.avatar;
                this.nickName.text = res.list.self.nickName;
                this.uid.text = res.list.self.userId;
                this.volume.text = `${res.list.self.consum} USDT`;
            }
        }).catch((err:any)=>{
            console.log(err.message);
        })
    }

    /**说明 */
    private openRankPrizeHelp(){
        window.location.href = 'https://m.xyhj.io/rankPrizeHelp.html';
    }
 } 