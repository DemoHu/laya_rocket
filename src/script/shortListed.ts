/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:07:39
 * @modify date 2019-02-26 11:07:39
 * @desc 入围名单
 */

import { ui } from "../ui/layaMaxUI";
import { Tabbar } from "../view/Tabbar";
import api from "../js/api";

export default class ShortListed extends ui.shortListedUI {
    constructor() {
        super()
        this.on(Laya.Event.RESIZE, this, this.onResize)
    }

    onEnable() {
        this.getShortListed()

    }

    private getShortListed(page?: number) {
        api.getShortListed(page).then((res: any) => {
            this.shortList.repeatY = res.length;
            this.shortList.array = res;
            this.shortList.visible = true;
        }).catch((err: any) => {
            this.noData.visible = true;
            console.log(err.message);
        })
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配
        // this.shortList.height = this.height - 100;
    }
}
