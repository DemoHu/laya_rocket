/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-28 11:29:41
 * @modify date 2019-02-28 11:29:41
 * @desc 资源列表
 */


//图片资源
const comp = [
    { url: "res/atlas/comp.atlas", type: "atlas" },
	{ url: "res/atlas/comp/home.atlas", type: "atlas" },
	{ url: "res/atlas/comp/home/fire.atlas", type: "atlas" },
	{ url: "res/atlas/comp/home/wave.atlas", type: "atlas" },
    { url: "comp/img_star_bg01.png", type: "image" },
    { url: "comp/img_banner01.png", type: "image" },
    { url: "comp/img_myrank01.png", type: "image" },
    { url: "comp/img_payment_bg01.png", type: "image" },
    { url: "comp/img_rank01.png", type: "image" },
    { url: "comp/img_ranklist_bg01.png", type: "image" },
    { url: "comp/img_rocketRanking_bg01.png", type: "image" },
    { url: "comp/img_trend_banner01.png", type: "image" },
    // { url: "comp/img_xctj_bg01.png", type: "image" },
]

// 页面资源
const scene = [
    { url: "assistant.json", type: "json" },
    { url: "Card.json", type: "json" },
    { url: "fileconfig.json", type: "json" },
    { url: "grandPrix.json", type: "json" },
    { url: "guessing.json", type: "json" },
    { url: "home.json", type: "json" },
    { url: "priHistoryScene.json", type: "json" },
    { url: "record.json", type: "json" },
    { url: "unpack.json", type: "json" },
    // { url: "shortListed.json", type: "json" },
    { url: "Tabbar.json", type: "json" },
    { url: "version.json", type: "json" },
    // { url: "xctj.json", type: "json" },

    { url: "template/InputPwdDialog.json", type: "json" },
    { url: "template/joinRecords.json", type: "json" },
    { url: "template/numberListDOM.json", type: "json" },
    { url: "template/previousRecords.json", type: "json" },
    { url: "template/priHistory.json", type: "json" },
    { url: "template/prixList.json", type: "json" },
    { url: "template/rankingList.json", type: "json" },
    { url: "template/rechargeDialog.json", type: "json" },
    // { url: "template/shortList.json", type: "json" },
    { url: "template/showRocket.json", type: "json" },
    { url: "template/TipsDialog.json", type: "json" },
    { url: "template/trendList.json", type: "json" },
    // { url: "template/winningList.json", type: "json" },
]

const loadingResList = [
    ...comp,
    ...scene
]
export default loadingResList;
