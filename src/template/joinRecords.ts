/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:40
 * @modify date 2019-02-19 17:48:40
 * @desc 参与记录脚本
 */
import { ui } from '../ui/layaMaxUI'

export default class joinRecord extends ui.template.joinRecordsUI {
    constructor() {
        super()
    }
    set dataSource(item: any) {
        this._dataSource = item;
        console.log(item,'数据列表');
        
        if (item) {
           
        }
    }
}