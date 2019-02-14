import { ui } from "../ui/layaMaxUI";

export default class Guessing extends ui.guessingUI {

    private numberArr:number[] = []; //未选中的数据
    private halfArr:number[] = []; //一半的未选中数据
    private rawDataArr_new:any[] = [];//镜像数组
    private rawDataArr:any[] = [ //原始数据
        {index:1,status:1},
        {index:2,status:3},
        {index:3,status:1},
        {index:4,status:1},
        {index:5,status:4},
        {index:6,status:1},
        {index:7,status:1},
        {index:8,status:1},
        {index:9,status:4},
        {index:10,status:1},
        {index:11,status:3},
        {index:12,status:4},
        {index:13,status:1},
        {index:14,status:1},
        {index:15,status:3},
        {index:16,status:1},
        {index:17,status:1},
    ]

    constructor(){
        super()

        this.btn_buy.on(Laya.Event.CLICK,this,this.buyFunc)

        // 选择按钮组绑定事件
        this.random_one.on(Laya.Event.CLICK,this,this.selectFunc,[1])
        this.random_before.on(Laya.Event.CLICK,this,this.selectFunc,[2])
        this.random_after.on(Laya.Event.CLICK,this,this.selectFunc,[3])
        this.random_all.on(Laya.Event.CLICK,this,this.selectFunc,[4])
    }

    onEnable():void {
        console.log('进入页面');
        // 选项卡
        this.numberList.array = this.rawDataArr;
    }
    onOpened(data:any){
        console.log(data,'首页传递的card数据');
    }

    /**购买 */
    private buyFunc():void {
        alert(11123123)
    }

    /**
     * 选择按钮组
     * @param type 选择类型  1:随一  2：前半 3：后半 4：全部
     */
    private selectFunc(type:number){
        this.rawDataArr_new = this.rawDataArr; //初始化数组
        this.numberArr = [];//初始化数组
        this.halfArr = [];//初始化数组

        this.rawDataArr_new.forEach(item=>{
            if (item.status === 2) {
                item.status = 1;
            }
            if (item.status <= 2) {
                this.numberArr.push(item.index)
            }
        })

        if (type === 1) {
            this.randomNumber(this.numberArr,1) //随一
        }else if (type === 2) {
            this.halfArr = this.numberArr.slice(0,Math.floor(this.numberArr.length / 2))  //前半
            this.randomNumber(this.halfArr,2)
        }else if(type === 3) {
            this.halfArr = this.numberArr.slice(Math.floor(this.numberArr.length / 2))  //后半
            this.randomNumber(this.halfArr,2)
        }else if(type === 4) {
            this.halfArr = this.numberArr;//全部
            this.randomNumber(this.halfArr,2)
        }
    }

    /**从数组中随机取一个数 */
    private randomNumber(arr:number[],type?:number){
        const rand:number = Math.floor((Math.random() * arr.length)); //随一
        
        const index = arr[rand];
        
        if (type === 1) {
            this.rawDataArr_new.forEach(item => {
                if (item.index === index) {
                    item.status = 2;
                }
                
            })
        }
        if (type === 2) {
            arr.forEach(el => {
                this.rawDataArr_new.forEach(item => {
                    if (el === item.index) {
                        item.status = 2
                    }
                    
                })
            })
        }
        this.numberList.array = this.rawDataArr_new
    }
}