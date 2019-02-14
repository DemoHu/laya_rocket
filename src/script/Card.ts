import { ui } from "../ui/layaMaxUI";
import { Tabbar } from "../view/Tabbar";

export default class Card extends ui.CardUI {
    constructor(){
        super()
        this.on(Laya.Event.CLICK,this,this.clickItem)
    }
    set dataSource(item: any) {
        this._dataSource = item;
        if (item) {
            this.cardItem.skin = item.bgImg;
            this.sceneImg.skin = item.sceneImg;
            this.amount_label.text = `${item.amount} ${item.coinType}`
            this.current.text = `${item.amount/2} ${item.coinType}`
            this.speed.text = `${item.speed/2}/${item.speed}`
        }
    }

    private clickItem():void {
        // window.localStorage.setItem('index',this._dataSource.index)
        Tabbar.getInstance().openScene("guessing.scene", this._dataSource);
    }
}