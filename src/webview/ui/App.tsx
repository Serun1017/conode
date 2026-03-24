import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { 
    ReactFlow, 
    useNodesState, 
    useEdgesState, 
    addEdge, 
    Background, 
    Controls, 
    Connection,
    Node,
    Edge,
    BackgroundVariant
} from '@xyflow/react';
import dagre from 'dagre';
import { ThemeRegistry } from './plugins/ThemeRegistry';

const vscode = (window as any).acquireVsCodeApi();

export default function App() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [activeTheme] = useState<string>('default');
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const nodeTypes = useMemo(() => ThemeRegistry.getNodeTypes(activeTheme), [activeTheme]);

    // 선 연결 이벤트
    const onConnect = useCallback((params: Connection) => {
        setEdges((eds: Edge[]) => addEdge({ 
            ...params, 
            animated: true, 
            style: { stroke: '#4a90e2', strokeWidth: 2 } 
        }, eds));
        vscode.postMessage({ type: 'NODE_CONNECTED', payload: params });
    }, [setEdges]);

    // 노드 클릭 시 코드 위치로 이동
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.data && node.data.loc) {
            vscode.postMessage({ type: 'JUMP_TO_CODE', payload: node.data.loc });
        }
    }, []);

    // 파이썬 코드 실행 요청
    const handleRunCode = () => {
        setIsRunning(true);
        vscode.postMessage({ type: 'RUN_CODE' });
    };

    useEffect(() => {
        const handle = (e: MessageEvent) => {
            if (e.data.type === 'UPDATE_NODES') {
                const { nodes: ns, edges: es } = e.data.payload;
                
                // Dagre를 이용한 자동 레이아웃 설정
                const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
                g.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 70 });
                ns.forEach((n: any) => g.setNode(n.id, { width: 250, height: 150 }));
                es.forEach((e: any) => g.setEdge(e.source, e.target));
                dagre.layout(g);

                setNodes(ns.map((n: any) => ({
                    ...n,
                    position: { x: g.node(n.id).x - 125, y: g.node(n.id).y - 75 }
                })));
                setEdges(es);
                setIsRunning(false);
            }
        };
        window.addEventListener('message', handle);
        vscode.postMessage({ type: 'READY' });
        return () => window.removeEventListener('message', handle);
    }, [setNodes, setEdges]);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#242424', position: 'relative' }}> 
            
            {/* 상단 컨트롤 플로팅 버튼 */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '10px' }}>
                <button 
                    onClick={handleRunCode} 
                    disabled={isRunning}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isRunning ? '#555' : '#00ffa3',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}
                >
                    {isRunning ? 'Running...' : '▶ Run Code'}
                </button>
            </div>

            <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                nodeTypes={nodeTypes} 
                onNodesChange={onNodesChange} 
                onEdgesChange={onEdgesChange} 
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background id="comfy-grid" gap={25} size={1} color="#333" variant={BackgroundVariant.Lines} />
                <Controls style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px' }} />
            </ReactFlow>
        </div>
    );
}