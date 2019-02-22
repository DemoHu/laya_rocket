/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:50:10
 * @modify date 2019-02-19 17:50:10
 * @desc 底部导航Tabbar脚本
 */
import { ui } from '../ui/layaMaxUI'


const tabbarArr:string[] = ['home.scene','record.scene','assistant.scene'] //tabbar的页面
const pageArr:string[] = ['guessing.scene','grandPrix.scene','priHistoryScene.scene'] //非tabbar页面

export class Tabbar extends ui.TabbarUI {
    /**页面传递的参数 */
    private _openSceneParam: any;
    /**选中的tabbar */
    static _tabbar:Tabbar;
    /**页面数组 */
    static readonly SCENES:string[] = [...tabbarArr,...pageArr]

    static getInstance():Tabbar {
        if(!this._tabbar){
            this._tabbar = new Tabbar()
        }
        return this._tabbar;
    }

    static show(){
        let tabIns:Tabbar = this.getInstance()
        Laya.stage.addChild(tabIns)
    }
    static hide(){
        if(this._tabbar){
            this._tabbar.removeSelf()
        }
    }

    /**非tabbar跳转页面,可携带参数 */
    openScene(scene: string, param?: any) {
        this._openSceneParam = param;
        this.tab.selectedIndex = Tabbar.SCENES.indexOf(scene);
    }

    /**监视tabbar改变 */
    createView(view:any){
        super.createView(view)
        this.tab.on(Laya.Event.CHANGE,this,this.onClickTab);
        // this.onClickTab();
    }

    /**点击tabbar事件 */
    onClickTab() {
        let scene:string = Tabbar.SCENES[this.tab.selectedIndex]
        Laya.Scene.open(scene, true, this._openSceneParam);
        this._openSceneParam = null;

        this.tab.items.forEach(item=>{
            const tabBtn: Laya.Button = item as Laya.Button;
            const imgBtn: Laya.Button = tabBtn.getChildAt(0) as Laya.Button;
            imgBtn.selected = false;
        })
        tabbarArr.forEach(item=>{
            if (item === scene) {
                const tabBtn: Laya.Button = this.tab.selection as Laya.Button;
                const imgBtn: Laya.Button = tabBtn.getChildAt(0) as Laya.Button;
                imgBtn.selected = true;
            }
        })
        
    }
}