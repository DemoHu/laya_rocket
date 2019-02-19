/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:08
 * @modify date 2019-02-19 17:46:08
 * @desc 页面跳转类，在代码中使用
 */
import { Tabbar } from '../view/Tabbar'

export default class PageScript extends Laya.Script {
    /** @prop {name:showTab,tips:'是否有Tabbar',type:Bool,default:true} */
    public showTab:boolean = true;

    constructor(){super();}

    onEnable():void {
        if (this.showTab) {
            Tabbar.show()
        }
    }

    onDisable():void {
        Tabbar.hide()
    }
}