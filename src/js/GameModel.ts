/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 14:11:26
 * @modify date 2019-02-20 14:11:26
 * @desc 数据通信及保存接口
 */

export class GameModel extends Laya.EventDispatcher {
    private static _gameModelInstance: GameModel;

    static getInstance(): GameModel {
        if (!this._gameModelInstance) {
            this._gameModelInstance = new GameModel();
        }
        return this._gameModelInstance;
    }

    userInfo:object = {}; //用户信息
    /**保存用户信息 */
    setUserInfo(userInfo:object){
        this.userInfo = userInfo;
        this.event('getUserInfo',this.userInfo)
    }

    buyGoodsArr:any = []; //被购买号码
    /**保存被购买号码 */
    setGoodsArr(goodsArr:any) {
        this.buyGoodsArr = goodsArr;
        this.event('getbuyGoodsArr',[this.buyGoodsArr])
    }
    
}