/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 15:15:08
 * @modify date 2019-02-20 15:15:08
 * @desc api接口统一封装处理
 */

import { get, post } from './http';
import { GameModel } from './GameModel';

export default {
    /**获取用户信息 */
    getUserInfo() {
        return new Promise((resolve, reject) => {
            get('/user/getInfo', {}).then((res: any) => {
                if (!res.code) {
                    // 保存用户信息
                    GameModel.getInstance().setUserInfo(res.userInfo)
                    resolve(res)
                } else {
                    GameModel.getInstance().setUserInfo({})
                    reject(res)
                }
            })
        })
    },

    /**获取今日大奖池 */
    getRankToday() {
        return new Promise((resolve, reject) => {
            get('/rank/today', {}).then((res: any) => {
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },
    /**获取大奖池历史记录
     * @param countTime [选填] 日期
     */
    getRankHistory(countTime?:string){
        return new Promise((resolve, reject) => {
            get('/rank/history', {countTime}).then((res: any) => {
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },
    /**获取首页商品列表 */
    getGoodsList() {
        return new Promise((resolve, reject) => {
            get('/goods/index', {}).then((res: any) => {
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**获取商品详情
     * @param goodsId 商品id
     */
    getGoodsDetails(goodsId:string){
        return new Promise((resolve,reject) => {
            get('/goods/get', { goodsId }).then((res: any) => {
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**获取参与记录
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     */
    getMyOrders(page:number = 1,pageSize:number = 20){
        return new Promise((resolve,reject) => {
            get('/order/myOrders',{page,pageSize}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },
    
    /**获取往期记录
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     * @param countTime [选填] 查询时间
     * @param searchKey [选填] 查询期号
     */
    getGoodsHistory(page:number = 1,pageSize:number = 20,countTime?:string,searchKey?:string){
        return new Promise((resolve,reject) => {
            get('/goods/history',{page,pageSize,countTime,searchKey}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**获取商品类型 */
    getGoodsCateList(){
        return new Promise((resolve,reject)=>{
            get('/goods/cateList',{}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**获取走势
     * @param goodsType 商品类型
     * @param page [选填] 页码1
     * @param pageSize [选填] 分页数 默认20
     */
    getGoodsTrend(goodsType:string,page:number = 1,pageSize:number = 20){
        return new Promise((resolve,reject)=>{
            get('/goods/trend',{goodsType,page,pageSize}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**获取喜从天降中奖名单
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     */
    getXctjList(page:number = 1,pageSize:number = 20){
        return new Promise((resolve,reject) => {
            get('/Xctj/bonusLists',{page,pageSize}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },
    
    /**获取入围名单
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     * @param date [选填] 时间
     */
    getShortListed(page:number = 1,pageSize:number = 20,date?:string){
        return new Promise((resolve,reject) => {
            get('/Xctj/shortListed',{page,pageSize,date}).then((res:any)=>{
                if (!res.code) {
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },

    /**购买
     * @param period 期号
     * @param codeList 所选号码
     * @param exchangePwd 交易密码
     */
    postTradeBuy(period:string,codeList:string,exchangePwd:string){
        return new Promise((resolve,reject) => {
            post('/trade/buy', { period,codeList,exchangePwd }).then((res: any) => {
                if (!res.code) {
                    this.getUserInfo()
                    resolve(res)
                } else {
                    reject(res)
                }
            })
        })
    },
}