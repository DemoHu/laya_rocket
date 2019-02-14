import { ui } from "../ui/layaMaxUI";


export default class Card extends ui.template.numberListDOMUI {
    constructor(){
        super()
        this.on(Laya.Event.CLICK,this,this.clickNumber)

    }
    set dataSource(item: any) {
        this._dataSource = item;
        if (item) {
            this.index.text = item.index;
            this.bgImg.skin = this.returnStatusImg(item.status)
        }
    }

    /**
     * 选择号码
     * @param item 当前按钮
     */
    private clickNumber(item:any):void {
        if (this._dataSource.status === 3 || this._dataSource.status === 4) {
            return;
        }else if(this._dataSource.status === 1){
            this.bgImg.skin = this.returnStatusImg(2)
            this._dataSource.status = 2;
        }else if(this._dataSource.status === 2){
            this.bgImg.skin = this.returnStatusImg(1)
            this._dataSource.status = 1;
        }
    }


    /**
     * 根据状态返回对应图片
     * @param status  1：可选 2：选中 3:不可选 4：已选
     * 
    */
    private returnStatusImg(status:number){
        switch (status) {
            case 1:return 'comp/guessing/img_kexuan_select20.png'
            case 2:return 'comp/guessing/img_ok_select20.png'
            case 3:return 'comp/guessing/img_no_select20.png'
            case 4:return 'comp/guessing/img_yixuan_select20.png'
            default:return 'comp/guessing/img_kexuan_select20.png'
        }
    }

    
}