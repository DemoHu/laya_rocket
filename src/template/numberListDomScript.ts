import { ui } from "../ui/layaMaxUI";


export default class numberListDOM extends ui.template.numberListDOMUI {
    private userId:string = localStorage.getItem('userId');
    constructor(){
        super()
        this.on(Laya.Event.CLICK,this,this.clickNumber)

    }
    set dataSource(item: any) {
        this._dataSource = item;
        if (item) {
            this.code.text = item.code;
            this.bgImg.skin = this.returnStatusImg(item.buyerId)
        }
    }

    /**
     * 选择号码
     * @param item 当前按钮
     */
    private clickNumber(item:any):void {
        if (+this._dataSource.buyerId > 10) { //用户id必大于10，作为判断依据
            return;
        }else if(this._dataSource.buyerId === '0'){
            this.bgImg.skin = this.returnStatusImg('2')
            this._dataSource.buyerId = '2';
        }else if(this._dataSource.buyerId === '2'){
            this.bgImg.skin = this.returnStatusImg('0')
            this._dataSource.buyerId = '0';
        }
    }


    /**
     * 根据状态返回对应图片
     * @param buyerId  0：可选 2：选中 大于10:不可选  等于自己userId：已选
     * 
    */
    private returnStatusImg(buyerId:string){
        if (buyerId === this.userId) {
            return 'comp/guessing/img_yixuan_select20.png'
        }else if(+buyerId > 10){ //用户id必大于10，作为判断依据
            return 'comp/guessing/img_no_select20.png'
        }else if(buyerId === '2') {
            return 'comp/guessing/img_ok_select20.png'
        }else {
            return 'comp/guessing/img_kexuan_select20.png'
        }
    }

    
}