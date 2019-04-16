/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:08
 * @modify date 2019-02-19 17:49:08
 * @desc 往期记录脚本
 */
import { ui } from '../ui/layaMaxUI'
import utils from '../js/utils';

export default class previousRecord extends ui.template.previousRecordsUI {
    constructor(){
        super()
        this.txHash.on(Laya.Event.CLICK,this,this.seeHash)
    }
    set dataSource(item: any) {
        this._dataSource = item;
        if (item) {
            this.period.text = item.period;
            this.goodsName.text = item.goodsName;
            this.txHash.text = item.txHash;
            this.hitCode.text = item.hitCode;
            this.openTime.text = utils.formatDateTime(item.openTime);
            this.joinedNum.text = item.joinedNum;
        }
    }

    /**查看哈希 */
    seeHash():void {
        const domain = document.domain;
        if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
            window.location.href = `https://ropsten.etherscan.io/tx/${this._dataSource.txHash}`;
        } else {
            window.location.href = `https://etherscan.io/tx/${this._dataSource.txHash}`;
        }
        
    }
}