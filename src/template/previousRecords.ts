/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:08
 * @modify date 2019-02-19 17:49:08
 * @desc 往期记录脚本
 */
import { ui } from '../ui/layaMaxUI'

export default class previousRecord extends ui.template.previousRecordsUI {
    constructor(){
        super()
        this.hash.on(Laya.Event.CLICK,this,this.seeHash)
    }
    set dataSource(item: any) {
        this._dataSource = item;
        console.log(item,'数据列表');
        
        if (item) {
            this.number.text = item.number;
            this.lotteryType.text = item.lotteryType;
        }
    }

    /**查看哈希 */
    seeHash():void {
        console.log(this._dataSource.lotteryType);
    }
}