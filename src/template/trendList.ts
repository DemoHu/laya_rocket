/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:32:01
 * @modify date 2019-02-21 16:32:01
 * @desc 走势列表脚本
 */
import { ui } from '../ui/layaMaxUI'
import utils from '../js/utils';
import { Tabbar } from '../view/Tabbar';

export default class trendList extends ui.template.trendListUI {
    private _item:any;
    constructor() {
        super()
        this.btnBuy.on(Laya.Event.CLICK,this,this.btnBuyFunc)
    }
    set dataSource(item:any){
        this._item = item;
        if (item) {
            this.period.text = item.period;
            this.hitCode.text = item.hitCode;
            this.odd_even.text = item.is === 0 ? '-' :  item.is === 1 ? '奇' : '偶';
            this.isBig.text = item.is === 0 ? '-' : item.isBig ? '大' : '小';

            if (item.is === 0) {
                this.btnBuy.visible = true;
                this.hitCode.visible = false;
            }else{
                this.btnBuy.visible = false;
                this.hitCode.visible = true;
            }
            // 奇偶文字颜色
            if (item.is === 1) {
                this.odd_even.color = '#f14848';
            }else if(item.is === 2){
                this.odd_even.color = '#25fffd';
            }
            // 大小文字颜色
            if (!item.isBig && item.is !== 0) {
                this.isBig.color = '#f14848';
            }else if(item.isBig && item.is !== 0){
                this.isBig.color = '#25fffd';
            }
        }
    }

    /**立即购买 */
    private btnBuyFunc(){
        console.log(this._item.period);
        Tabbar.getInstance().openScene('guessing.scene',this._item.goodsId)
    }
}