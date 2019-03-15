/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-15 14:52:34
 * @modify date 2019-03-15 14:52:34
 * @desc laya公共工具方法
 */

export default {
    getScreen(){
        const sceneContainer: Laya.Sprite = Laya.Scene.root as Laya.Sprite;
        for (let i = 0; i < sceneContainer.numChildren; i++) {
            const child = sceneContainer.getChildAt(i);
            if (child instanceof Laya.Scene) {
                return child;
            }
        }
        return null;
    }
}