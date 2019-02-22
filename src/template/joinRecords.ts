/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:40
 * @modify date 2019-02-19 17:48:40
 * @desc 参与记录脚本
 */
import { ui } from '../ui/layaMaxUI'
import utils from '../js/utils';

export default class joinRecord extends ui.template.joinRecordsUI {
    constructor() {
        super()
    }
    set dataSource(item: any) {
        this._dataSource = item;

        if (item) {
            this.period.text = item.period;
            this.goodsValue.text = `${+utils.toDecimal(item.goodsValue,2)}`;
            this.codeList.text = item.codeList;

            if (item.status === '0') {
                this.noPrize.visible = true;
                this.noPrize.text = '未开奖';
                this.openTime.text = '-';
                this.hitCode.text = '-';
            }else if(item.status === '1'){
                this.noPrize.visible = true;
                this.noPrize.text = '开奖中';
                this.openTime.text = '-';
                this.hitCode.text = '-';
            }else if(item.status === '2' && !item.hit){
                this.noPrize.visible = true;
                this.noPrize.text = '未中奖';
                this.openTime.text = utils.formatDateTime(item.openTime);
                this.hitCode.text = item.hitCode;
            }else if(item.status === '2' && item.hit){
                this.prize.visible = true;
                this.openTime.text = utils.formatDateTime(item.openTime);
                this.hitCode.text = item.hitCode;
                this.award.visible = true;
                this.award.text = `${+utils.toDecimal(item.award,2)} USDT`;
            }
        }
    }
}