/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:11
 * @modify date 2019-02-19 17:47:11
 * @desc 首页商品卡脚本
 */
import { ui } from "../ui/layaMaxUI";
import { Tabbar } from "../view/Tabbar";

import utils from '../js/utils'

export default class Card extends ui.CardUI {
    constructor(){
        super()
        this.on(Laya.Event.CLICK,this,this.clickItem)
    }
    set dataSource(item: any) {
        this._dataSource = item;
        if (item) {
            //金币图片,  1-400金币图标2;   501-1000金币图标4;  1001以上金币图标20
            if (+item.goodsValue <= 400 ) {
                this.cardItem.skin = `comp/home/img_jinbi_2.png`
            }else if(+item.goodsValue <= 1000){
                this.cardItem.skin = `comp/home/img_jinbi_4.png`
            }else if(+item.goodsValue >= 1001) {
                this.cardItem.skin = `comp/home/img_jinbi_20.png`
            }
            this.sceneImg.skin = `comp/home/img_scene_${item.totalNum}.png`
            this.goodsName.text = `${+item.goodsValue} USDT`
            this.award.text = `${utils.toDecimal(item.award,2)}`
            this.soldNum_totalNum.text = `${item.soldNum}/${item.totalNum}`
            this.progress.value = +`${item.soldNum/item.totalNum}`
        }
    }

    private clickItem():void {
        if (this._dataSource !== null) {
            Tabbar.getInstance().openScene('guessing.scene',this._dataSource.goodsId)
        }
    }
}