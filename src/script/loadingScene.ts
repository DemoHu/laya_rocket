
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-18 16:59:13
 * @modify date 2019-03-18 16:59:13
 * @desc 页面加载loading
 */
import { ui } from "../ui/layaMaxUI";

 export default class loadingScene extends ui.loadingSceneUI {
    
    constructor() {
        super()
    }

    setProgress(value:number){
        console.log(value,'当前进度');
        this.loadingProgress.value = value;
        let val:string  = `${value * 100}`;
        this.progress.text = `${parseInt(val,0)}%`;
        this.rocketloading.x = 365 * value;
    }
 }
