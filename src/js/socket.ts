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
    
    static WS_URL: string = 'wss://t-wss.xyhj.io/ws?appid=luckyrocketApp'
    static WS: any = '';
    /**30秒一次心跳 */
    static setIntervalWesocketPush:any = null; 

    static createSocket() {
        if (!Socket.WS) {
            // Socket.WS.close()
            Socket.WS = new WebSocket(Socket.WS_URL)
            Socket.WS.onopen = Socket.onopenWS;
            Socket.WS.onmessage = Socket.onmessageWS;
            Socket.WS.onerror = Socket.onerrorWS;
            Socket.WS.onclose = Socket.oncloseWS;
        }
    }
    /**打开WS */
    static onopenWS() {
        Socket.sendPing(); //发送心跳
    }
    /**连接失败 */
    static onerrorWS() {
        Socket.WS.close();
        Socket.createSocket(); //重连
    }
    /**WS数据接收 */
    static onmessageWS(e: any) {
        let redata:any;
        let payload:any;
        if (e.data === 'ok' || e.data === 'pong') {
            redata = e.data; // 数据
        }else{
            redata = JSON.parse(e.data); // 数据
            payload = redata.payload;
            // 购买号码下发
            if (payload.type === 'purchased') {
                GameModel.getInstance().setGoodsArr(payload.goods)
                
            }
        }
    }
    /**发送数据 */
    static sendWSPush(data?: any) {
        if (Socket.WS !== null && Socket.WS.readyState === 3) {
            Socket.WS.close();
            Socket.createSocket();//重连
        } else {
            let obj = {
                "appId": "luckyrocketApp", 
                "event": [
                    {"type": data, "toggle": 1, "expireTime": 360000}
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

