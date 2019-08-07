/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:58
 * @modify date 2019-02-19 17:47:58
 * @desc 购买页面脚本
 */
import { ui } from "../ui/layaMaxUI";
import { Toast } from "../view/Toast";
import utils from '../js/utils'
import IptPswDom from "../template/pswInput";
import { GameModel } from "../js/GameModel";
import api from "../js/api";
import { Socket } from "../js/socket";

export default class Guessing extends ui.guessingUI {

    private goodsId:string = '';//商品ID
    private _period:string = ''; //期号
    private selectNumber:number = 0; //选中个数
    private unitPrice:number = 0; //单价
    private totalPrice:number = 0; //总价
    private myAmount:number = 0; //总资产
    private numberArr:number[] = []; //未选中的数据
    private halfArr:number[] = []; //一半的未选中数据
    private rawDataArr_new:any[] = [];//镜像数组
    private rawDataArr:any[] = [];//原始数据

    private inputPwd: IptPswDom; //密码输入框
    private codeList:string = ''; //购买号码

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

        //获取用户资产
        const userInfo:any = GameModel.getInstance().userInfo;
        this.balance.text = `${utils.toDecimal(userInfo.money,2)} USDT`;
        this.myAmount = +`${utils.toDecimal(userInfo.money,2)}`;
        if (!userInfo.userId) { //未登录不显示我的余额
            this.balanceBox.visible = false;
            this.estimate.y = 80;
        }else{
            this.balanceBox.visible = true;
            this.estimate.y = 42;
        }
        // 监视资产变动
        GameModel.getInstance().on('getUserInfo',this,((userInfo:any)=>{
            this.balance.text = `${utils.toDecimal(userInfo.money,2)} USDT`;
            this.myAmount = +`${utils.toDecimal(userInfo.money,2)}`;
        }))

        // 号码被购买变动
        GameModel.getInstance().on('getbuyGoodsArr',this,(goodsArr:any)=>{
            this.rawDataArr.forEach((item:any)=>{
                goodsArr.forEach((v:any)=>{
                    if (item.code === v.code) {
                        item.userId = v.userId;
                        item.buyerId = v.userId;
                    }
                })
            })
            this.progressSpeed.value = +`${goodsArr.length / this.numberList.array.length}`;
            this.soldNum_soldNum.text = `${goodsArr.length}/${this.numberList.array.length}`;
            this.numberList.array = this.rawDataArr; //号码列表
        })
    }
    onOpened(goodsId:any){
        this.goodsId = goodsId;
        this.getGoodsDetails(this.goodsId);
    }
    onDisable(){
        //  关闭websocket事件
        Socket.sendWSPush(`buy_${this._period}`,0)
    }

    /**购买 */
    private buyFunc():void {
        let userInfo = Object.keys(GameModel.getInstance().userInfo);
        if (userInfo.length === 0) {
            console.log('未登录跳转登录');
            window.location.href = `https://${document.domain}/#/account_sign`
        }else if (this.getSelectNumber() <= 0) {
            Toast.show('请选择购买号码')
        }else if(this.totalPrice > this.myAmount){
            Toast.show('余额不足')
        }else{
            this.inputPwd = new IptPswDom()
            this.inputPwd.popup();
            this.inputPwd.setData({ //发送数据
                period:this.period.text,
                codeList:this.codeList,
                AllCodeList:this.numberList.array
            })
            // 监听输入框组件事件
            this.inputPwd.on('refreshData',this,()=>{
                this.getGoodsDetails(this.goodsId);
                this.total.text = '0 USDT';
            })
        }
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

    /**从数组中随机取一个数
     * @param arr 数据列表
     * @param type [可选] 随机类型
     */
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
        // this.numberList.repeatY = this.rawDataArr_new.length;
        this.numberList.array = this.rawDataArr_new;
        this.getSelectNumber()
    }

    /**获取商品详情
     * @param goodsId 商品id
     */
    private getGoodsDetails(goodsId:string) {
        api.getGoodsDetails(goodsId).then((res:any)=>{

            //  发送websocket事件
            this._period = res.period;
            Socket.sendWSPush(`buy_${this._period}`)

            this.price.text = `${+res.price}`;
            this.goodsValue.text = `${+res.goodsValue} USDT`;
            this.progressSpeed.value = +`${res.soldNum/res.totalNum}`;
            this.soldNum_soldNum.text = `${res.soldNum}/${res.totalNum}`;
            this.period.text = res.period;
            this.unitPrice = +res.price;
            this.rawDataArr = res.codeList;
            this.numberList.array = this.rawDataArr; //号码列表
            this.random_one.visible = true;
            if (this.numberList.array.length > 2) {
                this.random_after.visible = true;
                this.random_before.visible = true;
                this.random_all.visible = true;
            }else{
                this.random_one.width = 300;
                this.random_one.centerX = 0;
            }
            this.numberList.repeatX = 5;
            this.numberList.repeatY = 4;
            this.numberList.cells.forEach((item: Laya.Sprite) => {
                item.on("GetItem", this, this.getSelectNumber)
            })
        }).catch((err:any)=>{
            console.log(err.message);
        })
    }

    /**监听统计列表数据选中个数 */
    private getSelectNumber(){
        this.selectNumber = 0;
        this.codeList = '';
        this.numberList.array.forEach(item=>{
            if (item.buyerId === '2') {
                this.selectNumber = this.selectNumber + 1;
                let codeString:string = `${this.codeList}${this.codeList.length > 0 ? ',':''}${item.code}`;
                this.codeList =  codeString;
            }
        })
        this.total.text = utils.toDecimal((this.unitPrice * this.selectNumber),2) + ' USDT';
        this.totalPrice = +utils.toDecimal((this.unitPrice * this.selectNumber),2);

        return this.selectNumber;
    }
}