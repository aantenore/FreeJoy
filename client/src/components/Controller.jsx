import React, { useEffect, useState } from 'react';
import { DPad } from './DPad';
import { ActionButtons } from './ActionButtons';
import { DirectionalButtons } from './DirectionalButtons';
import { ShoulderButtons } from './ShoulderButtons';
import './Controller.css';

/**
 * Controller Component with Portrait Orientation Warning
 */
export function Controller({ playerId, onInput }) {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    const handleInput = (button, state) => {
        onInput(button, state);
    };

    const handleButtonPress = (button) => {
        onInput(button, 1);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleButtonRelease = (button) => {
        onInput(button, 0);
    };

    return (
        <>
            {isPortrait && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    flexDirection: 'column',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '20px' }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                    </svg>
                    <h2 style={{ fontSize: '24px', marginTop: '20px' }}>🔄 Ruota il telefono</h2>
                    <p style={{ fontSize: '16px', opacity: 0.8, marginTop: '10px' }}>
                        Questo controller funziona solo in modalità landscape
                    </p>
                </div>
            )}

            <div className="controller">
                {/* LEFT CONTROLLER ZONE (BLUE-ISH) */}
                <div className="zone-left">
                    {/* L / ZL */}
                    <ShoulderButtons side="left" onInput={handleInput} />

                    {/* Left Stick (Top) */}
                    <div className="stick-container relative z-10">
                        <DPad onInput={handleInput} clickButton="L3" prefix="" />
                    </div>

                    {/* D-Pad (Bottom) */}
                    <div className="dpad-container">
                        <DirectionalButtons onInput={handleInput} />
                    </div>
                </div>

                {/* CENTER CONSOLE ZONE */}
                <div className="zone-center py-2">
                    <button
                        className="center-btn btn-minus"
                        onTouchStart={(e) => { e.preventDefault(); handleButtonPress('Minus'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease('Minus'); }}
                        onMouseDown={() => handleButtonPress('Minus')}
                        onMouseUp={() => handleButtonRelease('Minus')}
                    >−</button>

                    <div className="player-indicator my-1">
                        <div className={`player-badge player-${playerId}`}>
                            P{playerId}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 mb-1">
                        <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_lime]"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    </div>

                    <button
                        className="center-btn btn-plus"
                        onTouchStart={(e) => { e.preventDefault(); handleButtonPress('Plus'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease('Plus'); }}
                        onMouseDown={() => handleButtonPress('Plus')}
                        onMouseUp={() => handleButtonRelease('Plus')}
                    >+</button>
                </div>

                {/* RIGHT CONTROLLER ZONE (RED-ISH) */}
                <div className="zone-right">
                    {/* R / ZR */}
                    <ShoulderButtons side="right" onInput={handleInput} />

                    {/* Action Buttons (Top) */}
                    <div className="action-container">
                        <ActionButtons onInput={handleInput} />
                    </div>

                    {/* Right Stick (Bottom) */}
                    <div className="stick-container relative z-10">
                        <DPad onInput={handleInput} clickButton="R3" prefix="RS_" />
                    </div>
                </div>
            </div>
        </>
    );
}
