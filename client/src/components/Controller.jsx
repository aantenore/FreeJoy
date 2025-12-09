import React, { useEffect, useState } from 'react';
import { DPad } from './DPad';
import { ActionButtons } from './ActionButtons';
import { DirectionalButtons } from './DirectionalButtons';
import './Controller.css';

/**
 * Controller Component - Single Unit (Landscape Only)
 * Layout: [Top: Shoulders] [Left: Stick] [Center: Black strip] [Right: Buttons]
 */
export function Controller({ playerId, playerProfile, onInput, onAnalog, totalPlayers = 4 }) {
    const [isPortrait, setIsPortrait] = useState(false);

    // Determine Controller type from profile or playerId
    let isLeftJoyCon = playerId === 1 || playerId === 3;
    if (playerProfile?.type) {
        isLeftJoyCon = playerProfile.type === 'left_joycon';
    }

    // Check orientation
    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // Try to lock landscape
        if (screen.orientation?.lock) {
            screen.orientation.lock('landscape').catch(() => { });
        }

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    const handleInput = (button, state) => {
        onInput(button, state);
        if (state === 1 && navigator.vibrate) navigator.vibrate(10);
    };

    const bgColor = isLeftJoyCon
        ? 'linear-gradient(135deg, #00C3E3 0%, #0088A3 100%)'
        : 'linear-gradient(135deg, #FF4554 0%, #C41E3A 100%)';

    const stickClickLabel = isLeftJoyCon ? 'L3' : 'R3';

    return (
        <>
            {/* Portrait Blocking Overlay */}
            {isPortrait && (
                <div className="portrait-blocker">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                    </svg>
                    <h2>🔄 Ruota il telefono</h2>
                    <p>Questo controller funziona solo in modalità landscape</p>
                </div>
            )}

            <div className="landscape-controller" style={{ background: bgColor }}>


                {/* === TOP ROW: All Shoulder Buttons === */}
                <div className="top-row">
                    {isLeftJoyCon ? (
                        <>
                            <ShoulderBtn label="ZL" onInput={handleInput} />
                            <ShoulderBtn label="L" onInput={handleInput} />
                            <ShoulderBtn label="SL" onInput={handleInput} />
                            <ShoulderBtn label="SR" onInput={handleInput} />
                        </>
                    ) : (
                        <>
                            <ShoulderBtn label="SL" onInput={handleInput} />
                            <ShoulderBtn label="SR" onInput={handleInput} />
                            <ShoulderBtn label="R" onInput={handleInput} />
                            <ShoulderBtn label="ZR" onInput={handleInput} />
                        </>
                    )}
                </div>

                {/* === MAIN AREA === */}
                <div className="main-area">
                    {/* LEFT: Stick */}
                    <div className="stick-zone">
                        <DPad
                            onInput={handleInput}
                            onAnalog={onAnalog}
                            clickButton={stickClickLabel}
                            prefix={isLeftJoyCon ? "" : "RS_"}
                        />
                    </div>

                    {/* CENTER: Black Strip with +/-, LED, L3/R3 */}
                    <div className="center-strip">
                        <button
                            className="center-btn"
                            onTouchStart={(e) => { e.preventDefault(); handleInput(isLeftJoyCon ? 'Minus' : 'Plus', 1); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleInput(isLeftJoyCon ? 'Minus' : 'Plus', 0); }}
                            onMouseDown={() => handleInput(isLeftJoyCon ? 'Minus' : 'Plus', 1)}
                            onMouseUp={() => handleInput(isLeftJoyCon ? 'Minus' : 'Plus', 0)}
                        >
                            {isLeftJoyCon ? '−' : '+'}
                        </button>

                        <div className="led-group">
                            {Array.from({ length: totalPlayers }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`led ${(i + 1) === playerId ? 'led-on' : ''}`}
                                />
                            ))}
                        </div>

                        <button
                            className="center-btn stick-click-btn"
                            onTouchStart={(e) => { e.preventDefault(); handleInput(stickClickLabel, 1); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleInput(stickClickLabel, 0); }}
                            onMouseDown={() => handleInput(stickClickLabel, 1)}
                            onMouseUp={() => handleInput(stickClickLabel, 0)}
                        >
                            {stickClickLabel}
                        </button>
                    </div>

                    {/* RIGHT: D-Pad or ABXY */}
                    <div className="buttons-zone">
                        {isLeftJoyCon ? (
                            <DirectionalButtons onInput={handleInput} />
                        ) : (
                            <ActionButtons onInput={handleInput} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}


// === SUB-COMPONENTS ===

function ShoulderBtn({ label, onInput }) {
    return (
        <button
            className="shoulder-btn-new"
            onTouchStart={(e) => { e.preventDefault(); onInput(label, 1); }}
            onTouchEnd={(e) => { e.preventDefault(); onInput(label, 0); }}
            onMouseDown={() => onInput(label, 1)}
            onMouseUp={() => onInput(label, 0)}
            onMouseLeave={() => onInput(label, 0)}
        >
            {label}
        </button>
    );
}
