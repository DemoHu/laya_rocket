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