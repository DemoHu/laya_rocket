/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:20:15
 * @modify date 2019-02-26 10:20:15
 * @desc 喜从天降中奖名单
 */
import { ui } from "../ui/layaMaxUI";
import api from "../js/api";
import { Toast } from "../view/Toast";
import { Tabbar } from "../view/Tabbar";

export default class Winning extends ui.xctjUI {
    constructor() {
        super()
        this.btn_shortlist.on(Laya.Event.CLICK,this,this.ShortListFunc)
        this.on(Laya.Event.RESIZE,this,this.onResize)
    }

    onEnable(){
        this.getXctjList()
    }


    private getXctjList(page?:number){
        api.getXctjList(page).then((res:any)=>{
            this.winningList.repeatY = res.length;
            this.winningList.array = res;
            this.winningList.visible = true;
        }).catch((err:any)=>{
            this.noData.visible = true;
            console.log(err.message);
        })
    }
    
    /**查看今日入围名单 */
    private ShortListFunc(){
        Tabbar.getInstance().openScene('shortListed.scene')
    }

    /**监视屏幕大小变化 */
    onResize(){
        //列表高度适配 = 屏幕高度 - banner
        this.winningList.height = this.height - 600;
    }
}
