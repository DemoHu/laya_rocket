import { ui } from "../ui/layaMaxUI";
import utils from "../js/utils";

/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:21:37
 * @modify date 2019-02-26 10:21:37
 * @desc 喜从天降中奖名单列表脚本
 */

export default class WinningList extends ui.template.winningListUI {
    constructor() {
        super()
    }
    set dataSource(item: any) {
        if (item) {
            this.period.text = item.belongTime;
            this.date.text = utils.formatDateTime(item.balanceTime);
            this.nickName.text = item.nickName;
            this.amount.text = `${+item.money} USDT`;
            this.code.text = item.hitNumber;
        }
    }
}
