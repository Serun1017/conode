import * as vscode from 'vscode';
import * as path from 'path';
import { PythonParser } from '../core/PythonParser';
import { DiagramMapper } from '../core/DiagramMapper';
import { RuntimeTracker } from '../core/RuntimeTracker';

export class WebviewManager {
    private panel: vscode.WebviewPanel | undefined;
    private parser = new PythonParser();
    private currentCode: string = '';

    public createOrShow(context: vscode.ExtensionContext, initialCode: string) {
        this.currentCode = initialCode;

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'conode', 'CoNode Diagram', vscode.ViewColumn.Two,
                { 
                    enableScripts: true, 
                    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out'))],
                    retainContextWhenHidden: true // 탭 이동 시 상태 유지
                }
            );

            this.panel.onDidDispose(() => { this.panel = undefined; });
            this.panel.webview.html = this.getHtml(context);
            
            this.panel.webview.onDidReceiveMessage(async msg => {
                switch (msg.type) {
                    case 'READY':
                        this.update(this.currentCode);
                        break;
                    case 'RUN_CODE':
                        await this.runDynamicAnalysis(this.currentCode, context.extensionPath);
                        break;
                    case 'JUMP_TO_CODE':
                        this.jumpToCode(msg.payload);
                        break;
                }
            });
        }
    }

    /**
     * 정적 분석 업데이트 (저장 시 호출)
     */
    public update(code: string) {
        this.currentCode = code;
        if (!this.panel) return;
        
        try {
            const ast = this.parser.getAstNodes(code);
            const flowData = DiagramMapper.toFlowData(ast);
            this.panel.webview.postMessage({ type: 'UPDATE_NODES', payload: flowData });
        } catch (e) {
            console.error("Static Analysis Error:", e);
        }
    }

    /**
     * 동적 분석 실행 (버튼 클릭 시 호출)
     */
    private async runDynamicAnalysis(code: string, extensionPath: string) {
        if (!this.panel) return;

        // 뼈대 재구성
        const ast = this.parser.getAstNodes(code);
        const flowData = DiagramMapper.toFlowData(ast);

        try {
            // 실제 파이썬 실행 (Output Channel에 로그 출력됨)
            const runtimeData = await RuntimeTracker.executeAndTrace(code, extensionPath);
            
            if (!runtimeData.error) {
                const mergedData = DiagramMapper.mergeRuntimeData(flowData, runtimeData);
                this.panel.webview.postMessage({ type: 'UPDATE_NODES', payload: mergedData });
            } else {
                // 에러 발생 시에도 무한 로딩 해제를 위해 뼈대 데이터 재전송
                this.panel.webview.postMessage({ type: 'UPDATE_NODES', payload: flowData });
            }
        } catch (error) {
            console.error("Dynamic Analysis Failed:", error);
            this.panel.webview.postMessage({ type: 'UPDATE_NODES', payload: flowData });
        }
    }

    /**
     * 에디터 내 특정 위치로 커서 이동 및 스크롤
     */
    private jumpToCode(loc: { startRow: number, startCol: number, endRow: number, endCol: number }) {
        const pyEditor = vscode.window.visibleTextEditors.find(e => 
            e.document.languageId === 'python' || e.document.fileName.endsWith('.py')
        );
        
        if (pyEditor) {
            // 커서가 위치할 지점 (보통 이름이 시작되는 부분)
            const targetPos = new vscode.Position(loc.startRow, loc.startCol);
            
            // 1. 선택 영역을 단일 지점으로 설정하여 하이라이트 없이 커서만 이동
            pyEditor.selection = new vscode.Selection(targetPos, targetPos);
            
            // 2. 해당 코드가 화면 중앙에 오도록 스크롤 이동
            const range = new vscode.Range(targetPos, new vscode.Position(loc.endRow, loc.endCol));
            pyEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            
            // 3. 에디터 탭으로 포커스 전환
            vscode.window.showTextDocument(pyEditor.document, pyEditor.viewColumn, false);
        }
    }

    private getHtml(context: vscode.ExtensionContext) {
        const scriptUri = this.panel!.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview.js')));
        const cssUri = this.panel!.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview.css')));
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${cssUri}" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;overflow:hidden;background-color:#242424;">
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}