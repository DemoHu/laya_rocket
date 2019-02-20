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
            this.openTime.text = utils.formatDateTime(item.openTime);
            this.hitCode.text = item.hitCode;
            this.codeList.text = item.codeList;
            if (item.status === '0') {
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '未开奖';
                this.openTime.text = '---';
                this.hitCode.text = '---';
            }else if(item.status === '1'){
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '开奖中';
                this.openTime.text = '---';
                this.hitCode.text = '---';
            }else if(item.status === '2' && item.hit === 0){
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '未中奖';
                this.award.visible = false;
            }else if(item.status === '2' && item.hit === 1){
                this.prize.visible = true;
                this.noPrize.visible = false;
                this.award.text = `${+utils.toDecimal(item.goodsValue,2)} USDT`;
                this.award.visible = true;
            }
        }
    }
}