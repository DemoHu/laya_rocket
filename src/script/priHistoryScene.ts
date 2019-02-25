/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖历史记录页面
 */
import { ui } from "../ui/layaMaxUI";
import utils from "../js/utils";
import api from "../js/api";
import { Tabbar } from "../view/Tabbar";

 export default class grandPrix extends ui.priHistorySceneUI {
     constructor(){
         super()
     }

     onEnable(){
        this.getRankHistory()
     }

     /**获取大奖信息 */
    private getRankHistory(){
        api.getRankHistory().then((res:any)=>{
            this.total.text = `总奖金:${utils.toDecimal(res.potMoney,2)} USDT`
            if (res.list.list1.data.length === 0 && res.list.list2.data.length === 0 && res.list.list3.data.length === 0) {
                this.listBox.visible = false;
                this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {  
                this.listBox.visible = true;
                this.box1.visible = true;
                this.alone1.text = `独得 ${utils.toDecimal(res.list.list1.dividmoney,2)} USDT`
                this.Proportion1.text = `占奖池${res.list.list1.percent}`
                this.prixList1.array = res.list.list1.data
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                this.listBox.visible = true;
                this.box2.visible = true;
                this.alone2.text = `每人 ${utils.toDecimal(res.list.list2.dividmoney/4,2)} USDT`
                this.Proportion2.text = `占奖池${res.list.list2.percent}`
                this.prixList2.array = res.list.list2.data
            }
             // 5-15名
             if (res.list.list3.data.length > 0) {
                this.listBox.visible = true;
                this.box3.visible = true;
                this.alone3.text = `每人 ${utils.toDecimal(res.list.list3.dividmoney/10,2)} USDT`
                this.Proportion3.text = `占奖池${res.list.list3.percent}`
                this.prixList3.array = res.list.list3.data
            }
        }).catch((err:any)=>{
            console.log(err.message);
        })
    }
 } 