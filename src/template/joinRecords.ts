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