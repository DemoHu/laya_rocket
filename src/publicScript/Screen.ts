/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:30
 * @modify date 2019-02-19 17:46:30
 * @desc 屏幕自适应脚本
 */
export default class Screen extends Laya.Script {
    /** @prop {name:bgColor,tips:'背景颜色','type:String,default:'#0a0738'} */
    public bgColor:string = '#0a0738'

    constructor(){super();}

    onEnable():void {
       Laya.stage.on(Laya.Event.RESIZE,this,this.onResize)
       this.onResize()
    }

    onDisable():void {
        Laya.stage.off(Laya.Event.RESIZE,this,this.onResize)
    }

    private onResize():void {
        const _that = (this.owner as Laya.Sprite);
        _that.width = Laya.stage.width;
        _that.height = Laya.stage.height;
        _that.graphics.drawRect(0,0,Laya.stage.width,Laya.stage.height,this.bgColor);
       
    }
}