/*
 * @Author: Siwen 
 * @Date: 2019-02-14 10:41:37 
 * @Last Modified by: mikey.zhaopeng
 * @Last Modified time: 2019-02-14 11:01:19
 * 屏幕自适应脚本
 */


export default class Screen extends Laya.Script {
    /** @prop {name:bgColor,tips:'背景颜色','type:String,default:'#09083c'} */
    public bgColor:string = '#09083c'

    constructor(){super();}

    onEnable():void {
       Laya.stage.on(Laya.Event.RESIZE,this,this.onResize)
       this.onResize()
    }

    onDisable():void {
        Laya.stage.off(Laya.Event.RESIZE,this,this.onResize)
    }

    private onResize():void {
        (this.owner as Laya.Sprite).width = Laya.stage.width;
        (this.owner as Laya.Sprite).height = Laya.stage.height;
        (this.owner as Laya.Sprite).graphics.drawRect(0,0,Laya.stage.width,Laya.stage.height,this.bgColor);
    }
}