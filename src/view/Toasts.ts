import { ui } from '../ui/layaMaxUI'
import Text = Laya.Text;
export class Toast extends ui.template.ToastUI {

    static toast:Text;

    static createToast():Text {
        if (!this.toast) {
            this.toast = new Laya.Text();
            this.toast.overflow = 'scroll';
            this.toast.color = "#fff";
            this.toast.padding = [10,20,10,20]
            this.toast.fontSize = 26;
            this.toast.leading = 10;
            this.toast.width = 300;
            this.toast.x = Laya.stage.width/2 - 150;
            this.toast.y = 500;
            this.toast.wordWrap = true;
            this.toast.bgColor = 'rgba(87, 174, 253,0.7)'
            this.toast.align = 'center'
            this.toast.valign = 'middle'
        }
        return this.toast;
    }

    static show(content:string){
        this.toast = this.createToast()
        Laya.stage.addChild(this.toast);
        
        this.toast.text = content;
        
        setTimeout(()=>{
            this.toast.removeSelf()
        },3000)
    }
}