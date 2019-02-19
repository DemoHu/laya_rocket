import { ui } from "../ui/layaMaxUI";
import { Toast } from "../view/Toasts";

import { get } from '../js/http'

export default class Guessing extends ui.guessingUI {

    private goodsId:string = '';//商品ID
    private numberArr:number[] = []; //未选中的数据
    private halfArr:number[] = []; //一半的未选中数据
    private rawDataArr_new:any[] = [];//镜像数组
    private rawDataArr:any[] = [];//原始数据

    constructor(){
        super()

        this.btn_buy.on(Laya.Event.CLICK,this,this.buyFunc)

        // 选择按钮组绑定事件
        this.random_one.on(Laya.Event.CLICK,this,this.selectFunc,[1])
        this.random_before.on(Laya.Event.CLICK,this,this.selectFunc,[2])
        this.random_after.on(Laya.Event.CLICK,this,this.selectFunc,[3])
        this.random_all.on(Laya.Event.CLICK,this,this.selectFunc,[4])
    }

    onEnable():void {
        console.log('进入页面');
        this.balance.text = `${localStorage.getItem('myAmount')} USDT`;
    }
    onOpened(goodsId:any){
        this.goodsId = goodsId;
        this.getGoodsDetails(this.goodsId)
    }

    /**购买 */
    private buyFunc():void {
        // console.log('改变之后的数据源',this.numberList.array);
        // let inputPwd: ui.template.InputPwdDialogUI = new ui.template.InputPwdDialogUI();
        // inputPwd.popup();
        Toast.show('这是提示文字这是提示文字这是提示文字这是提示文字')
    }

    /**
     * 选择按钮组
     * @param type 选择类型  1:随一  2：前半 3：后半 4：全部
     */
    private selectFunc(type:number){
        this.rawDataArr_new = this.rawDataArr; //初始化数组
        this.numberArr = [];//初始化数组
        this.halfArr = [];//初始化数组

        this.rawDataArr_new.forEach(item=>{
            if (item.buyerId === '2') {
                item.buyerId = '0';
            }
            if (item.buyerId <= 2) {
                this.numberArr.push(item.code)
            }
        })

        if (type === 1) {
            this.randomNumber(this.numberArr,1) //随一
        }else if (type === 2) {
            this.halfArr = this.numberArr.slice(0,Math.floor(this.numberArr.length / 2))  //前半
            this.randomNumber(this.halfArr,2)
        }else if(type === 3) {
            this.halfArr = this.numberArr.slice(Math.floor(this.numberArr.length / 2))  //后半
            this.randomNumber(this.halfArr,2)
        }else if(type === 4) {
            this.halfArr = this.numberArr;//全部
            this.randomNumber(this.halfArr,2)
        }
    }

    /**从数组中随机取一个数 */
    private randomNumber(arr:number[],type?:number){
        const rand:number = Math.floor((Math.random() * arr.length)); //随一
        
        const code = arr[rand];
        
        if (type === 1) {
            this.rawDataArr_new.forEach(item => {
                if (item.code === code) {
                    item.buyerId = '2';
                }
                
            })
        }
        if (type === 2) {
            arr.forEach(el => {
                this.rawDataArr_new.forEach(item => {
                    if (el === item.code) {
                        item.buyerId = '2';
                    }
                    
                })
            })
        }
        this.numberList.array = this.rawDataArr_new
    }


    /**获取商品详情 */
    private getGoodsDetails(goodsId:string) {
        get('/goods/get',{ goodsId }).then((res:any)=>{
            this.price.text = `${+res.price}`;
            this.goodsValue.text = `${+res.goodsValue} USDT`;
            this.progressSpeed.value = +`${res.soldNum/res.totalNum}`;
            this.soldNum_soldNum.text = `${res.soldNum}/${res.totalNum}`;
            this.period.text = res.period;
            this.rawDataArr = res.codeList;
            this.numberList.array = this.rawDataArr; //号码列表
        })
    }
}