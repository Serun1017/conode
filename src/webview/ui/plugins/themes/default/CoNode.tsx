import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export const CoNode = ({ data }: any) => {
  const getThemeColor = (type: string) => {
    switch (type) {
      case 'variable': return '#ff9800';
      case 'function': return '#4a90e2';
      case 'external': return '#673ab7';
      case 'array':    return '#00bcd4';
      default:         return '#444';
    }
  };

  const nodeType = data.nodeType || 'variable';
  const themeColor = getThemeColor(nodeType);
  const isArray = nodeType === 'array';

  return (
    <div style={{ 
      backgroundColor: 'rgba(25, 25, 25, 0.95)', borderRadius: '8px', border: `1px solid ${themeColor}`, 
      color: '#eee', minWidth: '220px', fontFamily: 'sans-serif', boxShadow: '0 6px 12px rgba(0,0,0,0.6)', overflow: 'hidden'
    }}>
      {/* Header: 주신 디자인 유지 */}
      <div style={{ background: themeColor, padding: '6px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', color: '#111' }}>
        {data.label}
      </div>
      
      <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* [핵심] 리스트 요소별 개별 포트 생성 */}
        {isArray && data.elements && (
            <div style={{ margin: '0 10px 5px 10px', background: '#111', padding: '6px', borderRadius: '4px', border: '1px solid #333', fontSize: '11px' }}>
                <span style={{ fontSize: '9px', color: themeColor, display: 'block', textAlign: 'center', marginBottom: '6px' }}>ELEMENTS</span>
                {data.elements.map((el: any, i: number) => (
                    <div key={i} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        borderBottom: i === data.elements.length - 1 ? 'none' : '1px solid #222', 
                        padding: '4px 0', position: 'relative' 
                    }}>
                        <span style={{ color: themeColor, fontWeight: 'bold' }}>[{i}]</span>
                        <span style={{ color: '#fff', paddingRight: '15px' }}>{el.value}</span>
                        {/* 각 엘리먼트 전용 출력 포트 */}
                        <Handle 
                            type="source" 
                            position={Position.Right} 
                            id={`out-element-${i}`} 
                            style={{ background: '#ff4b4b', width: '8px', height: '8px', right: '-12px', border: 'none' }} 
                        />
                    </div>
                ))}
            </div>
        )}

        {/* Runtime Value (일반 변수용) */}
        {!isArray && data.value && (
            <div style={{ margin: '0 10px 5px 10px', background: '#111', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid #333' }}>
                <span style={{ fontSize: '9px', color: themeColor, display: 'block' }}>VALUE</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{data.value}</span>
            </div>
        )}

        {/* Inputs & Outputs (기본 포트) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: 1 }}>
            {data.inputs?.map((inp: any) => (
              <div key={inp.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px', paddingLeft: '24px' }}>
                <Handle type="target" position={Position.Left} id={`in-${inp.name}`} style={{ background: '#00ffa3', width: '10px', height: '10px', left: '8px', border: 'none' }} />
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{inp.name}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {data.outputs?.map((out: any) => (
              <div key={out.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px', paddingRight: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{out.name}</div>
                <Handle type="source" position={Position.Right} id={`out-${out.name}`} style={{ background: '#ff4b4b', width: '10px', height: '10px', right: '8px', border: 'none' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CoNode);