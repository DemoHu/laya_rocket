import { ui } from "../ui/layaMaxUI";
import { Toast } from "../view/Toasts";

export default class Home extends ui.homeUI {
    constructor(){
        super()
    }
    onEnable():void{
        // 选项卡
        this.list.array = [
            {index:1,speed:2,amount:15,coinType:'USDT',bgImg:'comp/home/img_jinbi_2.png',sceneImg:'comp/home/img_scene_pk.png'},
            {index:2,speed:20,amount:45,coinType:'USDT',bgImg:'comp/home/img_jinbi_2.png',sceneImg:'comp/home/img_scene_20.png'},
            {index:3,speed:2,amount:90,coinType:'USDT',bgImg:'comp/home/img_jinbi_2.png',sceneImg:'comp/home/img_scene_pk.png'},
            {index:4,speed:2,amount:450,coinType:'USDT',bgImg:'comp/home/img_jinbi_4.png',sceneImg:'comp/home/img_scene_pk.png'},
            {index:5,speed:4,amount:900,coinType:'USDT',bgImg:'comp/home/img_jinbi_4.png',sceneImg:'comp/home/img_scene_4.png'},
            {index:6,speed:4,amount:1800,coinType:'USDT',bgImg:'comp/home/img_jinbi_20.png',sceneImg:'comp/home/img_scene_20.png'},
            {index:7,speed:4,amount:4500,coinType:'USDT',bgImg:'comp/home/img_jinbi_20.png',sceneImg:'comp/home/img_scene_20.png'},
        ];
    }
}