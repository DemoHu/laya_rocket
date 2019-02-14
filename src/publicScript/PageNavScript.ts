import { Tabbar } from "../view/Tabbar";

export default class PageNavScript extends Laya.Script {
    /** @prop {name:navPageScript,tips:'要跳转的scene',type:String,default:''} */
    public navPageScript:string = '';

    constructor(){super()}

    onClick():void {        
        Tabbar.getInstance().openScene(this.navPageScript);
    }
}