import * as vscode from 'vscode';
import { WebviewManager } from './webview/WebviewManager';

export function activate(context: vscode.ExtensionContext) {
    const manager = new WebviewManager();

    context.subscriptions.push(
        vscode.commands.registerCommand('conode.start', () => {
            const code = vscode.window.activeTextEditor?.document.getText() || '';
            manager.createOrShow(context, code);
        })
    );

    vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.languageId === 'python') {
            manager.update(doc.getText()); // 저장 시에는 정적 분석만 즉시 실행
        }
    });
}