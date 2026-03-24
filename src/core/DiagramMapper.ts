export class DiagramMapper {
    /**
     * AST를 분석하여 모든 노드와 개별 요소별 엣지를 생성합니다.
     */
    public static toFlowData(rootNode: any) {
        const nodes: any[] = [];
        const edges: any[] = [];
        const funcParamsMap: Record<string, any[]> = {};
        const lastVarInstanceMap: Record<string, string> = {};

        // [Pass 1] 구조적 정의 스캔 (클래스, 함수)
        rootNode.children.forEach((child: any) => {
            if (child.type === 'class_definition') {
                const nameNode = child.children.find((n: any) => n.type === 'identifier');
                if (nameNode) {
                    nodes.push({
                        id: nameNode.text, type: 'coNode',
                        data: {
                            label: nameNode.text,
                            inputs: [{ name: 'self', type: 'object' }],
                            outputs: [{ name: 'instance', type: nameNode.text }],
                            nodeType: 'class',
                            loc: { startRow: child.startPosition.row, startCol: child.startPosition.column, endRow: child.endPosition.row, endCol: child.endPosition.column }
                        }
                    });
                }
            }

            if (child.type === 'function_definition') {
                const nameNode = child.children.find((n: any) => n.type === 'identifier');
                const blockNode = child.children.find((n: any) => n.type === 'block');
                if (nameNode) {
                    const funcName = nameNode.text;
                    const params = this.extractParamsWithDetails(child);
                    funcParamsMap[funcName] = params;

                    let description = '';
                    if (blockNode && blockNode.children.length > 0) {
                        const firstStmt = blockNode.children[0];
                        if (firstStmt.type === 'expression_statement') {
                            const stringNode = firstStmt.children.find((n: any) => n.type === 'string');
                            if (stringNode) description = stringNode.text.replace(/^["']{1,3}|["']{1,3}$/g, '').trim();
                        }
                    }

                    nodes.push({
                        id: funcName, type: 'coNode',
                        data: {
                            label: funcName,
                            inputs: params,
                            outputs: [{ name: 'out', type: 'any' }],
                            nodeType: 'function',
                            description: description,
                            loc: { startRow: child.startPosition.row, startCol: child.startPosition.column, endRow: child.endPosition.row, endCol: child.endPosition.column }
                        }
                    });
                }
            }
        });

        // [Pass 2] 실행 흐름 분석
        const walkAst = (node: any) => {
            // 1. 변수 및 리스트 할당 처리
            if (node.type === 'assignment') {
                const leftNode = node.children.find((n: any) => n.type === 'identifier');
                const rightNode = node.children[node.children.length - 1];

                if (leftNode && rightNode) {
                    const varName = leftNode.text;
                    const row = leftNode.startPosition.row;
                    const varId = `var-${varName}-line${row}`;

                    if (['list', 'tuple'].includes(rightNode.type)) {
                        const elements = rightNode.children
                            .filter((n: any) => !['[', ']', '(', ')', ','].includes(n.type))
                            .map((n: any) => ({ value: n.text, type: n.type }));
                        
                        nodes.push({
                            id: varId, type: 'coNode',
                            data: { 
                                label: varName, 
                                nodeType: 'array', 
                                elements, 
                                inputs: [{ name: 'in', type: 'any' }], 
                                outputs: [{ name: 'out', type: 'any' }], // 전체 출력용
                                line: row + 1, 
                                loc: { startRow: leftNode.startPosition.row, startCol: leftNode.startPosition.column, endRow: leftNode.endPosition.row, endCol: leftNode.endPosition.column } 
                            }
                        });
                    } else {
                        let value = undefined;
                        if (rightNode.type !== 'call' && ['integer', 'string', 'float', 'true', 'false', 'none'].includes(rightNode.type)) {
                            value = rightNode.text;
                        }
                        nodes.push({
                            id: varId, type: 'coNode',
                            data: { label: varName, inputs: [{ name: 'in', type: 'any' }], outputs: [{ name: 'out', type: 'any' }], nodeType: 'variable', value, line: row + 1, loc: { startRow: leftNode.startPosition.row, startCol: leftNode.startPosition.column, endRow: leftNode.endPosition.row, endCol: leftNode.endPosition.column } }
                        });
                    }
                    lastVarInstanceMap[varName] = varId;
                }
            }

            // 2. 함수/메소드 호출 및 개별 포트 연결
            if (node.type === 'call') {
                const funcNameNode = node.children.find((n: any) => n.type === 'identifier' || n.type === 'attribute');
                const argsNode = node.children.find((n: any) => n.type === 'argument_list');

                if (funcNameNode && argsNode) {
                    const funcName = funcNameNode.text;
                    const isUserFunc = !!funcParamsMap[funcName];
                    const callId = isUserFunc ? funcName : `ext-${funcName}-${node.startPosition.row}`;

                    if (!isUserFunc) {
                        const actualArgs = argsNode.children.filter((n: any) => !['(', ')', ','].includes(n.type));
                        nodes.push({
                            id: callId, type: 'coNode',
                            data: { 
                                label: funcName, 
                                inputs: actualArgs.map((_: any, i: number) => ({ name: `arg${i}`, type: 'any' })), 
                                outputs: [{ name: 'out', type: 'any' }], 
                                nodeType: 'external', 
                                loc: { startRow: node.startPosition.row, startCol: node.startPosition.column, endRow: node.endPosition.row, endCol: node.endPosition.column } 
                            }
                        });
                    }

                    const actualArgs = argsNode.children.filter((n: any) => !['(', ')', ','].includes(n.type));
                    actualArgs.forEach((arg: any, i: number) => {
                        const targetHandle = isUserFunc ? `in-${(funcParamsMap[funcName][i] || {name: `arg${i}`}).name}` : `in-arg${i}`;
                        
                        // 기본 출력 핸들 설정
                        let sourceHandle = 'out-out';
                        
                        // [핵심] 인덱스 접근 시 해당 인덱스 전용 포트로 소스 변경
                        if (arg.type === 'subscript') {
                            const indexNode = arg.children.find((n: any) => n.type === 'integer' || n.type === 'string');
                            if (indexNode) {
                                // CoNode.tsx의 요소별 Handle ID와 매칭: out-element-0, out-element-1...
                                sourceHandle = `out-element-${indexNode.text.replace(/['"]/g, '')}`;
                            }
                        }

                        // 뿌리 변수 찾기 (재귀 탐색)
                        const sourceVarName = this.findBaseIdentifier(arg);
                        if (sourceVarName && lastVarInstanceMap[sourceVarName]) {
                            edges.push({ 
                                id: `e-${sourceVarName}-${callId}-${i}`, 
                                source: lastVarInstanceMap[sourceVarName], 
                                sourceHandle: sourceHandle, // 개별 포트 또는 전체 포트
                                target: callId, 
                                targetHandle, 
                                animated: true 
                            });
                        }
                        // 중첩 함수 호출 처리
                        else if (arg.type === 'call') {
                            const innerNameNode = arg.children.find((n: any) => n.type === 'identifier' || n.type === 'attribute');
                            if (innerNameNode) {
                                const innerIsUser = !!funcParamsMap[innerNameNode.text];
                                const innerId = innerIsUser ? innerNameNode.text : `ext-${innerNameNode.text}-${arg.startPosition.row}`;
                                edges.push({ id: `e-nest-${innerId}-${callId}-${i}`, source: innerId, sourceHandle: 'out-out', target: callId, targetHandle, animated: true });
                            }
                        }
                    });

                    // 리턴값 할당 연결
                    if (node.parent && node.parent.type === 'assignment') {
                        const leftVar = node.parent.children.find((n: any) => n.type === 'identifier');
                        if (leftVar) {
                            const varId = `var-${leftVar.text}-line${node.parent.startPosition.row}`;
                            edges.push({ id: `e-ret-${callId}-${varId}`, source: callId, sourceHandle: 'out-out', target: varId, targetHandle: 'in-in', animated: true });
                        }
                    }
                }
            }
            if (node.children) node.children.forEach(walkAst);
        };

        walkAst(rootNode);
        return { nodes, edges }; // 필터링 없이 모든 데이터 반환
    }

    /**
     * subscript나 attribute를 뚫고 실제 변수명을 찾아냅니다.
     */
    private static findBaseIdentifier(node: any): string | null {
        if (node.type === 'identifier') return node.text;
        if (node.type === 'subscript' || node.type === 'attribute') {
            return this.findBaseIdentifier(node.children[0]);
        }
        return null;
    }

    /**
     * 런타임 값 병합 (리스트 노드 포함)
     */
    public static mergeRuntimeData(flowData: any, runtimeData: any) {
        if (runtimeData.error) return flowData;
        flowData.nodes.forEach((node: any) => {
            if ((node.data.nodeType === 'variable' || node.data.nodeType === 'array') && node.data.line) {
                const varName = node.data.label;
                const lineNum = node.data.line;
                let val = undefined;
                for (let i = 0; i <= 5; i++) {
                    const snap = runtimeData[String(lineNum + i)];
                    if (snap && snap[varName] !== undefined) { val = snap[varName]; break; }
                }
                if (val !== undefined) node.data.value = typeof val === 'object' ? JSON.stringify(val) : String(val);
            }
        });
        return flowData;
    }

    private static extractParamsWithDetails(funcNode: any) {
        const paramsNode = funcNode.children.find((n: any) => n.type === 'parameters');
        if (!paramsNode) return [];
        return paramsNode.children.filter((p: any) => p.type.includes('parameter') || p.type === 'identifier').map((p: any) => ({
            name: p.type === 'identifier' ? p.text : (p.children.find((n: any) => n.type === 'identifier')?.text || 'arg'),
            type: 'any'
        }));
    }
}