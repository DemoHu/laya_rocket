/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 14:11:26
 * @modify date 2019-02-20 14:11:26
 * @desc 数据通信及保存接口
 */

export class GameModel extends Laya.EventDispatcher {
    private static _gameModelInstance: GameModel;

    userInfo:object = {}; //用户信息

    static getInstance(): GameModel {
        if (!this._gameModelInstance) {
            this._gameModelInstance = new GameModel();
        }
        return this._gameModelInstance;
    }

    /**保存用户信息 */
    setUserInfo(userInfo:object){
        this.userInfo = userInfo;
        this.event('getUserInfo',this.userInfo)
    }
}