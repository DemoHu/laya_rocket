import { GameModel } from "./GameModel";

/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 11:46:15
 * @modify date 2019-02-21 11:46:15
 * @desc websocket连接
 */

//{"appId":"luckyrocket","event":[{"toggle":0,"type":"type_value","expireTime":0}]}

export class Socket extends Laya.UIComponent {
    
    static WS_URL: string = `wss://t-wss.xyhj.io/ws?appid=luckyrocketApp`
    static WS: any = '';
    /**30秒一次心跳 */
    static setIntervalWesocketPush:any = null; 

    /**建立连接 */
    static createSocket() {
        const userInfo:any = GameModel.getInstance().userInfo;
        if (userInfo.userId) {
            Socket.WS_URL = Socket.WS_URL + `&uid=${userInfo.userId}`
        }
        if (!Socket.WS) {
            // Socket.WS.close()
            Socket.WS = new WebSocket(Socket.WS_URL)
            Socket.WS.onopen = Socket.onopenWS;
            Socket.WS.onmessage = Socket.onmessageWS;
            Socket.WS.onerror = Socket.onerrorWS;
            Socket.WS.onclose = Socket.oncloseWS;
        }
    }
    /**打开WS之后发送心跳 */
    static onopenWS() {
        Socket.sendPing(); //发送心跳
    }
    /**连接失败重连 */
    static onerrorWS() {
        Socket.WS.close();
        Socket.createSocket(); //重连
    }
    /**WS数据接收统一处理 */
    static onmessageWS(e: any) {
        let redata:any;
        let payload:any;
        if (e.data === 'ok' || e.data === 'pong') {
            redata = e.data; // 数据
        }else{
            redata = JSON.parse(e.data); // 数据
            payload = redata.payload;
            // 下发购买号码
            if (payload.type === 'purchased') {
                GameModel.getInstance().setGoodsArr(payload.goods)
            }
            // 下发首页数据
            if (payload.type === 'index') {
                // 刷新火箭数据
                GameModel.getInstance().setRocketData(payload.ranking)
                // 是否开奖了
                if (payload.toggle) {
                    GameModel.getInstance().isToggle(true)
                }
            }
            // 下发中奖名单
            if (payload.type === 'winning') {
                GameModel.getInstance().noticeFunc(true)
            }
        }
    }
    /**发送数据 */
    static sendWSPush(type?: any,toggle:any = 1) {
        if (Socket.WS !== null && Socket.WS.readyState === 3) {
            Socket.WS.close();
            Socket.createSocket();//重连
        } else {
            let obj = {
                "appId": "luckyrocketApp", 
                "event": [
                    {
                        "type": type, 
                        "toggle": toggle, 
                        "expireTime": 1800
                    }
                ]
            }
            Socket.WS.send(JSON.stringify(obj))
        }
    }
    /**关闭WS */
    static oncloseWS() {
        console.log('断开连接');
    }
    /**发送心跳 */
    static sendPing(){
        Socket.WS.send('ping');
        Socket.setIntervalWesocketPush = setInterval(() => {
            Socket.WS.send('ping');
        }, 30000)
    }
}

