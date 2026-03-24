import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode'; // [추가] vscode 모듈 임포트

export class RuntimeTracker {
    // [추가] VS Code 하단에 표시될 전용 출력 채널 생성
    private static outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel("CoNode Execution");

    public static async executeAndTrace(code: string, extensionPath: string): Promise<any> {
        return new Promise((resolve) => {
            // [추가] 실행 시작 시 출력 패널을 띄우고(Focus 뺏지 않음) 구분선 추가
            this.outputChannel.show(true);
            this.outputChannel.appendLine("\n========================================");
            this.outputChannel.appendLine("[CoNode] Running Code...");
            this.outputChannel.appendLine("========================================\n");

            const tracerPath = path.join(extensionPath, 'src', 'core', 'tracer.py');
            const pyProcess = spawn('python', [tracerPath]);
            
            let outputData = '';

            // stdout은 최종 JSON 스냅샷 데이터 수집용
            pyProcess.stdout.on('data', (data) => outputData += data.toString());
            
            // [핵심] stderr는 사용자의 print() 로그 및 에러 실시간 출력용
            pyProcess.stderr.on('data', (data) => {
                this.outputChannel.append(data.toString());
            });

            pyProcess.on('error', (err) => {
                this.outputChannel.appendLine(`\n[System Error] ${err.message}`);
                resolve({ error: "Spawn failed", details: err.message });
            });

            pyProcess.on('close', (codeStatus) => {
                this.outputChannel.appendLine(`\n[CoNode] close code (exit code: ${codeStatus})`);
                try {
                    const result = JSON.parse(outputData);
                    resolve(result);
                } catch (e) {
                    resolve({ error: "Parse failed", details: outputData });
                }
            });

            pyProcess.stdin.write(code);
            pyProcess.stdin.end();
        });
    }
}