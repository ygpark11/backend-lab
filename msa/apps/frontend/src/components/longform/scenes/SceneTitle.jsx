import React from 'react';
import { anim, ease } from '../engine';
import { KineticText } from '../primitives';
import { riseIn } from '../motion';

/** 씬 좌상단 헤더: 외곽선 번호 + 제목(키네틱) + 부제 + 강조 밑줄 */
export default function SceneTitle({ lt, num, title, sub, accent }) {
    const line = anim(lt, 0.25, 0.7, ease.outExpo);
    return (
        <div style={{ position: 'absolute', left: 120, top: 128, display: 'flex', alignItems: 'flex-end', gap: 26 }}>
            <div style={{
                fontSize: 112, fontWeight: 900, lineHeight: 0.8, letterSpacing: '-0.04em',
                color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.22)',
                ...riseIn(lt, -0.1, 0.8, 40),
            }}>
                {String(num).padStart(2, '0')}
            </div>
            <div style={{ paddingBottom: 2 }}>
                <div style={{ fontSize: 54, fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                    <KineticText text={title} t={lt} start={0.05} stagger={0.035} />
                </div>
                {sub && (
                    <div style={{ fontSize: 21, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginTop: 10, ...riseIn(lt, 0.35, 0.7, 14) }}>
                        {sub}
                    </div>
                )}
                <div style={{ height: 3, width: 220 * line, background: accent, marginTop: 14, borderRadius: 2, boxShadow: `0 0 14px ${accent}` }} />
            </div>
        </div>
    );
}
