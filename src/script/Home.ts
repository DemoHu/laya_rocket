import { ui } from "../ui/layaMaxUI";
import { Toast } from "../view/Toasts";

import { get,post } from '../js/http';

import utils from '../js/utils'

let obj1:Object = {a:1}
let obj2:Object = {c:1}

export default class Home extends ui.homeUI {
    constructor(){
        super()
        this.btnRecharge.on(Laya.Event.CLICK,this,this.btnRechargeFunc) 
    }
    onEnable():void{
        this.getUserInfo()
        this.rankToday()
        this.getGoodsList()
    }


    /**充值 */
    private btnRechargeFunc():void {
        alert('点击充值')
    }

    /**获取个人信息 */
    private getUserInfo() {
        post('/user/login',{
            orgId:1,
            account:'18900000003'
        }).then((res:any)=>{
            get('/user/getInfo',{}).then((res:any)=>{
                if (!res.code) {
                    this.nickName.text = res.userInfo.nickName
                    this.myAmount.text =`${utils.toDecimal(res.userInfo.money,2)}`
                    this.avatar.skin = res.userInfo.avatar
                    localStorage.setItem('myAmount',this.myAmount.text)
                    localStorage.setItem('userId',res.userInfo.userId)
                }else{
                    console.log(res.message);
                }
            })
        })
    }

    /**今日大奖池 */
    private rankToday(){
        get('/rank/today',{}).then((res:any)=>{
            this.rocketAmount.text = `${utils.toDecimal(res.potMoney,2)}`
            utils.countDown(res.countDown,((time)=>{
                this.rocketCountDown.text = time
            }))
        })
    }

    /**获取首页商品列表 */
    private getGoodsList(){
        get('/goods/index',{}).then((res:any)=>{
            console.log(res);
            this.list.array = res.list
            
        })
    }
}