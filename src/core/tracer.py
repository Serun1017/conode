import sys
import json
import traceback

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

# [핵심] 사용자의 일반 print() 출력을 표준 에러(stderr) 스트림으로 우회
class StderrRedirector:
    def write(self, message):
        sys.stderr.write(message)
        sys.stderr.flush()
    def flush(self):
        sys.stderr.flush()

original_stdout = sys.stdout
sys.stdout = StderrRedirector()

class RuntimeTracer:
    def __init__(self):
        self.snapshots = {}
        self.target_file = ""

    def trace_calls(self, frame, event, arg):
        if self.target_file not in frame.f_code.co_filename:
            return self.trace_calls

        line_no = frame.f_lineno
        
        if event in ['line', 'return']:
            local_vars = {}
            combined_vars = {**frame.f_globals, **frame.f_locals}
            
            for k, v in combined_vars.items():
                if not k.startswith('__') and not callable(v) and str(type(v)) != "<class 'module'>":
                    try:
                        json.dumps(v)
                        local_vars[k] = v
                    except (TypeError, OverflowError):
                        local_vars[k] = f"<Unserializable: {type(v).__name__}>"
            
            if line_no not in self.snapshots:
                self.snapshots[line_no] = {}
            self.snapshots[line_no].update(local_vars)

        return self.trace_calls

    def run_code(self, code_string, filename="<string>"):
        self.target_file = filename
        env = {'__name__': '__main__'} 
        sys.settrace(self.trace_calls)
        try:
            clean_code = code_string.encode('utf-8', 'ignore').decode('utf-8')
            exec(clean_code, env, env)
        except Exception as e:
            self.snapshots['error'] = str(e)
            self.snapshots['traceback'] = traceback.format_exc()
        finally:
            sys.settrace(None)
            
        return self.snapshots

if __name__ == "__main__":
    user_code = sys.stdin.read()
    tracer = RuntimeTracer()
    result = tracer.run_code(user_code)
    
    # [복구] 작업 완료 후 원래의 표준 출력으로 되돌려 JSON만 단독 전송
    sys.stdout = original_stdout
    print(json.dumps(result, ensure_ascii=False))