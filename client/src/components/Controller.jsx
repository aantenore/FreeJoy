import React, { useEffect } from 'react';
import { DPad } from './DPad'; // Now generic Joystick
import { ActionButtons } from './ActionButtons';
import { DirectionalButtons } from './DirectionalButtons'; // Real D-Pad
import { ShoulderButtons } from './ShoulderButtons';
import './Controller.css';

/**
 * Controller Component
 * Dual Stick, Full Button Layout
 * Forces Landscape Visuals
 */
export function Controller({ playerId, onInput }) {

    // Force Landscape Warning / CSS Handled
    useEffect(() => {
        // We can't really force browser orientation via JS API reliably across all devices without PWA manifest
        // But we can suggest it or rotate via CSS if needed.
        // For now, relying on CSS media queries or user rotation.
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
    );
}
