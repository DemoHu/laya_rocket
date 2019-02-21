export const LayerType = {
    LAYER_SCENE: "LAYER_SCENE",
    LAYER_UI: "LAYER_UI",
    LAYER_MSG: "LAYER_MSG"
}
const layerMap = {};

export class LayerManager {
    static inited: boolean;
    static init(layers: string[]) {
        layers.forEach((layerName: string) => {
            if (layerName === LayerType.LAYER_SCENE) {
                layerMap[layerName] = Laya.Scene.root;
            } else {
                const layer: Laya.UIComponent = layerMap[layerName] = new Laya.UIComponent();
                layer.left = 0;
                layer.right = 0;
                layer.top = 0;
                layer.bottom = 0;
                Laya.stage.addChild(layer);
            }
        });
        // Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
    }

    static addToLayer(node: Laya.Node, layerName): Boolean {
        LayerManager.checkInit();
        if (!node) return false;
        const layer = layerMap[layerName];
        if (!layer) return false;
        layer.addChild(node);
        return true;
    }

    static removeFromLayer(node: Laya.Node, layerName): Boolean {
        LayerManager.checkInit();
        const layer: Laya.UIComponent = layerMap[layerName];
        if (layer) {
            const rNode: Laya.Node = layer.removeChild(node)
            if (rNode) return true;
        }
        return false;
    }

    static getLayer(layerName): Laya.Component {
        return layerMap[layerName];
    }

    static checkInit() {
        if (LayerManager.inited) {
            return;
        }
        LayerManager.init([
            LayerType.LAYER_SCENE,
            LayerType.LAYER_UI,
            LayerType.LAYER_MSG
        ]);
        LayerManager.inited = true;
    }

    private static onResize(): void {
        for (const layerName in layerMap) {
            if (layerName !== LayerType.LAYER_SCENE && layerMap.hasOwnProperty(layerName)) {
                const layer: Laya.UIComponent = layerMap[layerName];
                layer.size(Laya.stage.width, Laya.stage.height);
                layer.event(Laya.Event.RESIZE);
            }
        }
    }

}