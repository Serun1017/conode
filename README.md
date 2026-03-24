```
conode/
├── package.json, esbuild.js, tsconfig.json  # 빌드 및 확장 프로그램 설정 파일
├── src/
│   ├── extension.ts                         # 확장 프로그램 진입점 (명령어 등록, 파일 저장 이벤트 감지)
│   ├── core/                                # 데이터 분석 및 변환 엔진 (백엔드 역할)
│   │   ├── PythonParser.ts                  # Tree-sitter를 이용한 파이썬 코드 정적 분석 (AST 트리 생성)
│   │   ├── DiagramMapper.ts                 # AST 데이터를 React Flow 규격(Nodes, Edges)으로 매핑 및 런타임 데이터 병합
│   │   ├── tracer.py                        # 파이썬 런타임 환경에서 실행 상태(변수 스냅샷)를 추적하는 스크립트
│   │   └── RuntimeTracker.ts                # tracer.py를 Child Process로 실행하고 결과를 JSON으로 파싱
│   └── webview/                             # 사용자 인터페이스 및 브릿지 (프론트엔드 역할)
│       ├── WebviewManager.ts                # VS Code 탭 생성, 메시지 라우팅(정적 업데이트 vs 동적 실행 분기)
│       └── ui/                              # React 기반 시각화 앱
│           ├── index.tsx                    # React 애플리케이션 마운트 포인트
│           ├── App.tsx                      # React Flow 캔버스, 상태 관리, 'Run Code' 버튼 및 레이아웃(Dagre) 처리
│           └── plugins/                     # 노드 디자인 확장 시스템
│               ├── ThemeRegistry.ts         # UI 디자인 테마를 관리하고 주입하는 레지스트리
│               └── themes/default/
│                   └── CoNode.tsx           # 단일 커스텀 노드 컴포넌트 (함수, 변수, 클래스, 배열별 조건부 렌더링)
```