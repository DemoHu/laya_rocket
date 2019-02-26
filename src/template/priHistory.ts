
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖历史记录脚本
 */
import { ui } from "../ui/layaMaxUI";
import utils from "../js/utils";

export default class priHistory extends ui.template.priHistoryUI {
    constructor() {
        super()
    }
    set dataSource(item: any) {
        if (item) {
            this.rankNo.text = item.rank < 10 ? `0${item.rank}` : `${item.rank}`;
            this.nickName.text = item.nickName;
            this.UID.text = `UID: ${item.userId}`;
            this.Volume.text = `${utils.toDecimal(item.consum,2)} USDT`
        }
    }
} 
