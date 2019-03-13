/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:28
 * @modify date 2019-02-19 17:48:28
 * @desc 记录页面脚本
 */
import { ui } from '../ui/layaMaxUI'
import api from '../js/api';

export default class Record extends ui.recordUI {

    static readonly HALF_SCROLL_ELASTIC_DISTANCE: number = 100;
    private _isScrollOverElasticDistance: boolean;
    private page:number = 1;

    constructor(){
        super()

        this.canyu.on(Laya.Event.CLICK,this,this.tabSwitch,[1])
        this.wangqi.on(Laya.Event.CLICK,this,this.tabSwitch,[2])
        this.on(Laya.Event.RESIZE,this,this.onResize)
    }

    onEnable():void{
        this.getMyOrders();
        // this.getGoodsHistory();

        //参与记录滚动加载更多
        this.joinList.scrollBar.changeHandler = Laya.Handler.create(this,this.onJoinListScrollChange,null,false)
        this.joinList.scrollBar.on(Laya.Event.END, this, this.onJoinListScrollEnd)
        //往期记录滚动加载更多
        this.previoousList.scrollBar.changeHandler = Laya.Handler.create(this,this.onPrevioousListScrollChange,null,false)
        this.previoousList.scrollBar.on(Laya.Event.END, this, this.onPrevioousListScrollEnd)
    }

    /**获取参与记录 */
    private getMyOrders(page = 1){
        api.getMyOrders(page).then((res:any)=>{
            if (this.joinList.array !== null) {
                this.joinList.array = [...this.joinList.array,...res]
            }else{
                this.joinList.array = res;
            }
            if (this.joinList.array.length > 0) {
                this.noData.visible = false;
                this.joinList.visible = true;
            }else{
                this.noData.visible = true;
            }
        }).catch((err:any)=>{
            this.noData.visible = true;
            console.log(err.message);
        })
    }
    /**获取往期记录 */
    private getGoodsHistory(page?:number){
        api.getGoodsHistory(page).then((res:any)=>{
            if (this.previoousList.array !== null) {
                this.previoousList.array = [...this.previoousList.array,...res]
            }else{
                this.previoousList.array = res;
            }
            if (this.previoousList.array.length > 0) {
                this.noData.visible = false;
                this.previoousList.visible = true;
            }else{
                this.noData.visible = true;
            }
        }).catch((err:any)=>{
            this.noData.visible = true;
            console.log(err.message);
        })
    }

    /**
     * 切换记录列表
     * @param type 1:参与记录  2：往期记录
     */
    private tabSwitch(type:number){
        this.page = 1;
        if (type === 1) {
            this.canyu.skin = 'comp/img_tab_active.png';
            this.wangqi.skin = 'comp/img_tab.png';
            this.getMyOrders()
            this.previoousList.scrollTo(0)
            this.previoousList.visible = false;
            this.previoousList.array = [];
        }else{
            this.wangqi.skin = 'comp/img_tab_active.png';
            this.canyu.skin = 'comp/img_tab.png';
            this.getGoodsHistory();
            this.joinList.scrollTo(0);
            this.joinList.visible = false;
            this.joinList.array = [];
        }
    }

    /**监视屏幕大小变化 */
    onResize(){
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.joinList.height = this.height - 430;
        this.previoousList.height = this.height - 430;
    }

    /**参与记录列表滚动 */
    private onJoinListScrollChange(v:any) {
        if (v > this.joinList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    private onJoinListScrollEnd(){
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            // this.event(GameEvent.NEXT_PAGE);
            this.page = this.page + 1;
            this.getMyOrders(this.page)
            // console.log(LogFlag.get(LogFlag.UI), "next page");
            
        }
    }

    /**参与记录列表滚动 */
    private onPrevioousListScrollChange(v:any) {
        if (v > this.previoousList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    private onPrevioousListScrollEnd(){
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsHistory(this.page)
        }
    }
}