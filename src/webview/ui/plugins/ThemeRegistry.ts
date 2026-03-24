import { NodeTypes } from '@xyflow/react';
import { CoNode } from './themes/default/CoNode'; // 변경하신 경로 반영

export class ThemeRegistry {
    // React Flow 공식 NodeTypes를 타입으로 강제
    private static themes: Record<string, NodeTypes> = {
        'default': {
            coNode: CoNode,
        },
    };

    public static getNodeTypes(themeName: string): NodeTypes {
        if (!this.themes[themeName]) {
            return this.themes['default'];
        }
        return this.themes[themeName];
    }
}