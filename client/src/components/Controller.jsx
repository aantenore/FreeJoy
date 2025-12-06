import React from 'react';
import { DPad } from './DPad';
import { ActionButtons } from './ActionButtons';
import { ShoulderButtons } from './ShoulderButtons';
import './Controller.css';

/**
 * Controller Component
 * Neon Joy-Con Style Layout
 */
export function Controller({ playerId, onInput }) {
    const handleButtonPress = (button) => {
        onInput(button, 1);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleButtonRelease = (button) => {
        onInput(button, 0);
    };

    const handleInput = (button, state) => {
        onInput(button, state);
    };

    return (
        <div className="controller">
            {/* LEFT JOY-CON ZONE (BLUE) */}
            <div className="zone-left">
                {/* L / ZL rendered absolutely or relative to top */}
                <ShoulderButtons side="left" onInput={handleInput} />

                <div className="mt-8">
                    <DPad onInput={handleInput} />
                </div>

                {/* Capture Button (Square) - Visual only for now or mapped to something */}
                <div className="absolute bottom-12 right-6 w-8 h-8 bg-slate-800 rounded mx-auto border border-slate-700 shadow-inner opacity-60"></div>
            </div>

            {/* CENTER CONSOLE ZONE */}
            <div className="zone-center">
                <button
                    className="center-btn btn-minus"
                    onTouchStart={() => handleButtonPress('Select')}
                    onTouchEnd={() => handleButtonRelease('Select')}
                    onMouseDown={() => handleButtonPress('Select')}
                    onMouseUp={() => handleButtonRelease('Select')}
                    onMouseLeave={() => handleButtonRelease('Select')}
                >−</button>

                <div className="player-indicator">
                    <div className={`player-badge player-${playerId}`}>
                        P{playerId}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_lime]"></div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                </div>

                <button
                    className="center-btn btn-plus"
                    onTouchStart={() => handleButtonPress('Start')}
                    onTouchEnd={() => handleButtonRelease('Start')}
                    onMouseDown={() => handleButtonPress('Start')}
                    onMouseUp={() => handleButtonRelease('Start')}
                    onMouseLeave={() => handleButtonRelease('Start')}
                >+</button>
            </div>

            {/* RIGHT JOY-CON ZONE (RED) */}
            <div className="zone-right">
                <ShoulderButtons side="right" onInput={handleInput} />

                <div className="mt-8">
                    <ActionButtons onInput={handleInput} />
                </div>

                {/* Home Button (Circle with house icon) */}
                <div className="absolute bottom-12 left-6 w-9 h-9 bg-slate-800 rounded-full border-4 border-slate-700/50 shadow-inner flex items-center justify-center opacity-60">
                    <div className="w-4 h-4 bg-transparent border-2 border-slate-500 rounded-sm"></div>
                </div>
            </div>
        </div>
    );
}
