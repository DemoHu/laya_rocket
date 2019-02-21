/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:46
 * @modify date 2019-02-19 17:45:46
 * @desc 页面跳转脚本，用于编辑模式插入
 */
import { Tabbar } from "../view/Tabbar";

export default class PageNavScript extends Laya.Script {
    /** @prop {name:navPageScript,tips:'要跳转的scene',type:String,default:''} */
    public navPageScript:string = '';

    constructor(){super()}

    onClick():void {
        Tabbar.getInstance().openScene(this.navPageScript)
    }
}