/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:34:21
 * @modify date 2019-02-21 16:34:21
 * @desc 助手页面脚本
 */

import { ui } from "../ui/layaMaxUI";
import api from "../js/api";
import { Toast } from "../view/Toast";
import screenUtils from "../js/screenUtils";


export default class Assistant extends ui.assistantUI {
    private cateListArr:any = [];
    private selectGoodsType:string = '';
    private tabType:number = 1;

    static readonly HALF_SCROLL_ELASTIC_DISTANCE: number = 100;
    private _isScrollOverElasticDistance: boolean;
    private page:number = 1;
    constructor(){
        super()
        this.btn_trend.on(Laya.Event.CLICK,this,this.tabSwitch,[1])
        this.btn_prebuy.on(Laya.Event.CLICK,this,this.tabSwitch,[2])
        this.on(Laya.Event.RESIZE,this,this.onResize)
    }

    onEnable():void{  
        this.getGoodsCateList()
        this.cateSwitch()

        //走势分析滚动加载更多
        this.trendList.scrollBar.changeHandler = Laya.Handler.create(this,this.onTrendListScrollChange,null,false)
        this.trendList.scrollBar.on(Laya.Event.END, this, this.onTrendListScrollEnd)
    }
    
    /**获取商品类型 */
    private getGoodsCateList(){
        api.getGoodsCateList().then((res:any)=>{
            this.cateListArr = res;
            const GoodsNameArr:string[] = [];
            res.forEach((item:any)=>{
                GoodsNameArr.push(item.goodsName)
            })
            this.cateTabList.repeatX = GoodsNameArr.length;
            this.cateTabList.array = GoodsNameArr;
            this.cateTabList.selectedIndex = 0;
        }).catch((err:any)=>{
            console.log(err.message);
        })
    }


    /**获取走势列表 */
    private getGoodsTrend(goodsType:string,page = 1){
        api.getGoodsTrend(goodsType,page).then((res:any)=>{
            if (this.trendList.array !== null) {
                this.trendList.array = [...this.trendList.array,...res]
            }else{
                this.trendList.array = res;
            }
            if (this.trendList.array.length > 0) {
                this.trendList.visible = true;
            }else{
                this.noData.visible = true;
            }
        }).catch((err:any)=>{
            this.noData.visible = true;
            console.log(err.message);
        })
    }

    /**
     * 切换列表
     * @param type 1:走势分析  2：预购
     */
    private tabSwitch(type:number){
        if (screenUtils.getScreen().name === 'record' && this.tabType === type) {
            return;
        }
        this.tabType = type;
        if (type === 2) {
            Toast.show('暂未开放，敬请期待')
        }
        // this.cateTabList.selectedIndex = 0;
        // if (this.tabType === 1) {
        //     this.btn_trend.skin = 'comp/guessing/img_tab_active.png';
        //     this.btn_prebuy.skin = 'comp/guessing/img_tab.png';
        //     this.listTitle.visible = true;
        //     if (this.trendList.array === null || this.trendList.array.length === 0) {
        //         this.noData.visible = true;
        //     }else {
        //         this.noData.visible = false;
        //         this.trendList.visible = true;
        //     }
        //     this.prebuy.scrollTo(0)
        //     this.prebuy.visible = false;
        // }else{
        //     this.btn_prebuy.skin = 'comp/guessing/img_tab_active.png';
        //     this.btn_trend.skin = 'comp/guessing/img_tab.png';
        //     this.listTitle.visible = false;
        //     if (this.prebuy.array === null || this.prebuy.array.length === 0) {
        //         this.noData.visible = true;
        //     }else {
        //         this.noData.visible = false;
        //         this.prebuy.visible = true;
        //     }
        //     this.trendList.scrollTo(0);
        //     this.trendList.visible = false;
        // }
    }

    /**商品类型切换 */
    private cateSwitch(){
        this.cateTabList.selectHandler = new Laya.Handler(this, (selectedIndex: any)=> {
            this.selectGoodsType = this.cateListArr[selectedIndex].goodsType;
            if (this.tabType === 1) {
                this.trendList.array = [];
                this.page = 1;
                this.getGoodsTrend(this.selectGoodsType,this.page)
            }else {
                console.log('暂未开放',this.selectGoodsType);
            }
            //改变tab选中状态
            let i: number = this.cateTabList.startIndex;
            this.cateTabList.cells.forEach((cell: Laya.Button) => {
                cell.selected = i === selectedIndex;
                i++;
            })
        })
    }

    /**监视屏幕大小变化 */
    onResize(){
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.trendList.height = this.height - 600;
        const trendNumber = this.trendList.height / 100;
        this.trendList.repeatY = Math.ceil(trendNumber)
        this.prebuy.height = this.height - 600;
        const prebuyNumber = this.prebuy.height / 100;
        this.trendList.repeatY = Math.ceil(prebuyNumber)
    }

    /**参与记录列表滚动 */
    private onTrendListScrollChange(v:any) {
        if (v > this.trendList.scrollBar.max + Assistant.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    private onTrendListScrollEnd(){
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsTrend(this.selectGoodsType,this.page)
            
        }
    }
   
}