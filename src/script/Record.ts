/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:28
 * @modify date 2019-02-19 17:48:28
 * @desc 记录页面脚本
 */
import { ui } from '../ui/layaMaxUI'

export default class Record extends ui.recordUI {
    constructor(){
        super()

        this.canyu.on(Laya.Event.CLICK,this,this.tabSwitch,[1])
        this.wangqi.on(Laya.Event.CLICK,this,this.tabSwitch,[2])
        this.on(Laya.Event.RESIZE,this,this.onResize)
    }

    onEnable():void{
        /**参与记录数据源 */
        this.joinList.array = [
            {id:'1',number:180002300002301,lotteryType:10001},
            {id:'2',number:180002300002301,lotteryType:10002},
            {id:'3',number:180002300002301,lotteryType:10003},
            {id:'4',number:180002300002301,lotteryType:10004},
            {id:'5',number:180002300002301,lotteryType:10005},
            {id:'6',number:180002300002301,lotteryType:10006},
            {id:'7',number:180002300002301,lotteryType:10007},
            {id:'8',number:180002300002301,lotteryType:10008},
            {id:'9',number:180002300002301,lotteryType:10009},
        ]
        /**往期记录数据源 */
        this.previoousList.array = [
            {id:'1',number:180002300002301,lotteryType:10001},
            {id:'2',number:180002300002301,lotteryType:10002},
            {id:'3',number:180002300002301,lotteryType:10003},
            {id:'4',number:180002300002301,lotteryType:10004},
            {id:'5',number:180002300002301,lotteryType:10005},
            {id:'6',number:180002300002301,lotteryType:10006},
            {id:'7',number:180002300002301,lotteryType:10007},
            {id:'8',number:180002300002301,lotteryType:10008},
            {id:'9',number:180002300002301,lotteryType:10009},
            {id:'10',number:180002300002301,lotteryType:10010},
            {id:'11',number:180002300002301,lotteryType:10011},
            {id:'12',number:180002300002301,lotteryType:10012},
            {id:'13',number:180002300002301,lotteryType:10013},
            {id:'14',number:180002300002301,lotteryType:10014},
            {id:'15',number:180002300002301,lotteryType:10015},
            {id:'16',number:180002300002301,lotteryType:10016},
            {id:'17',number:180002300002301,lotteryType:10017},
            {id:'18',number:180002300002301,lotteryType:10018},
            {id:'19',number:180002300002301,lotteryType:10019},
            {id:'20',number:180002300002301,lotteryType:10020},
            {id:'21',number:180002300002301,lotteryType:10021},
            {id:'22',number:180002300002301,lotteryType:10022},
            {id:'23',number:180002300002301,lotteryType:10023},
            {id:'24',number:180002300002301,lotteryType:10024},

        ]

        
        
        

    }

    /**监视屏幕大小变化 */
    onResize(){
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.joinList.height = this.height - 430;
        this.previoousList.height = this.height - 430;
    }

    /**
     * 切换记录列表
     * @param type 1:参与记录  2：往期记录
     */
    private tabSwitch(type:number){
        if (type === 1) {
            this.canyu.skin = 'comp/guessing/img_tab_active.png';
            this.wangqi.skin = 'comp/guessing/img_tab.png';
            this.joinList.visible = true;
            this.previoousList.visible = false;
        }else{
            this.wangqi.skin = 'comp/guessing/img_tab_active.png';
            this.canyu.skin = 'comp/guessing/img_tab.png';
            this.joinList.visible = false;
            this.previoousList.visible = true;
        }
    }
}