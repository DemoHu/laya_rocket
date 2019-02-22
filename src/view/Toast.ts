import { LayerManager, LayerType } from "./LayerManager";

export class Toast extends Laya.UIComponent {

    static MIN_WIDTH: number = 200;
    static MAX_WIDTH: number = 500;
    static TOP: number = 23;
    static BOTTOM: number = 20;
    static MARGIN: number = 15;
    static MIN_HEIGHT: number = 80;
    static FONT_SIZE: number = 26;
    static COLOR: string = "#ffffff";
    static BG_IMG_URL: string = "comp/img_toast_bg.png";
    static DURATION: number = 2500;

    private static instance: Toast;
    private static storeTextList: any[] = [];

    static show(text: string, duration: number = Toast.DURATION, coverBefore: boolean = true) {
        if (!Toast.instance) {
            Toast.instance = new Toast();
            Toast.instance.on(Laya.Event.CLOSE, Toast, Toast.onClose);
        }
        if (coverBefore && Toast.instance.parent) {
            Toast.instance.setText(text);
            Toast.instance.timer.once(duration || Toast.DURATION, Toast.instance, Toast.instance.close, null, true);
        } else if (!Toast.instance.parent) {
            Toast.doShow(text, duration);
        } else {
            Toast.storeTextList.push({
                text: text,
                duration: duration
            });
        }
    }

    protected static doShow(text: string, duration: number) {
        Toast.instance.setText(text);
        LayerManager.addToLayer(Toast.instance, LayerType.LAYER_MSG);
        Toast.instance.timer.once(duration || Toast.DURATION, Toast.instance, Toast.instance.close, null, true);
    }

    protected static onClose() {
        if (Toast.storeTextList.length > 0) {
            var data: any = Toast.storeTextList.shift();
            Toast.doShow(data.text, data.duration);
        }
    }

    bg: Laya.Image;
    label: Laya.Label;

    constructor() {
        super();
    }

    setText(text: string) {
        this.width = Toast.MAX_WIDTH;
        this.label.width = NaN;
        this.label.dataSource = text;
        this.onTextChange();
    }

    close() {
        this.removeSelf();
        this.event(Laya.Event.CLOSE);
    }

    createChildren() {
        this.centerX = 0;
        this.height = Toast.MARGIN + Toast.MARGIN;

        super.createChildren();
        this.bg = new Laya.Image();
        this.bg.skin = Toast.BG_IMG_URL;
        this.bg.sizeGrid = "25,25,25,25";
        this.bg.left = this.bg.right = this.bg.top = this.bg.bottom = 0;
        this.addChild(this.bg);

        this.label = new Laya.Label();
        this.label.color = Toast.COLOR;
        this.label.fontSize = Toast.FONT_SIZE;
        this.label.align = "center";
        this.label.y = Toast.TOP;
        this.label.centerX = 0;
        // this.label.centerY = 0;
        // this.label.stroke = 1;
        // this.label.strokeColor = "#000000";
        // this.label.top = Toast.MARGIN;
        // this.label.bottom = Toast.MARGIN;
        // this.label.left = Toast.MARGIN;
        // this.label.right = Toast.MARGIN;
        this.label.leading = 15;
        this.label.wordWrap = true;
        this.addChild(this.label);

    }

    // protected initialize() {
    //     super.initialize();
    //     this.bindViewEvent(this.label, Laya.Event.CHANGE, this.onTextChange);
    // }

    protected onTextChange() {
        let textW: number = this.label.width;
        const maxTextW: number = Toast.MAX_WIDTH - Toast.MARGIN * 2;
        // const minTextW: number = Toast.MIN_WIDTH - Toast.MARGIN * 2;
        if (textW > maxTextW) {
            this.label.width = maxTextW;
        }
        let w: number = this.label.width + Toast.MARGIN * 2;
        w = Math.min(w, Toast.MAX_WIDTH);
        w = Math.max(w, Toast.MIN_WIDTH);
        this.width = w;
        // this.height = this.label.height + Toast.TOP + Toast.BOTTOM;
        this.height = this.label.height + Toast.MARGIN * 2;
        this.x = (Laya.stage.width - this.width) >> 1;
        this.y = (Laya.stage.height - this.height) >> 1;
    }

    protected onCompResize() {
        // if (this.label) {
        //     this.height = this.label.height + MessageTip.MARGIN + MessageTip.MARGIN;
        // }
        if (this.bg) {
            this.bg.width = this.width;
            this.bg.height = this.height;
        }
    }
}