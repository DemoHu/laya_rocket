
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖火箭名单
 */
import { ui } from "../ui/layaMaxUI";
import utils from "../js/utils";

export default class prixList extends ui.template.rankingListUI {
    constructor() {
        super()
    }
    set dataSource(item: any) {
        if (item) {
            this.ranking.text = item.rank;
            this.nickName.text = item.nickName.length > 4 ? `${item.nickName.substr(0,4)}...` : item.nickName;
            this.uid.text = item.userId;
            this.amount.text = item.amount;
        }
    }
} 
