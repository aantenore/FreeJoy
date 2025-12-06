import React from 'react';
import './ShoulderButtons.css';

/**
 * Shoulder Buttons Component
 * L/R and ZL/ZR buttons, split by side
 */
export function ShoulderButtons({ onInput, side }) {
    const handleButtonPress = (button) => {
        onInput(button, 1);
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const handleButtonRelease = (button) => {
        onInput(button, 0);
    };

    const renderButton = (name, label) => (
        <button
            className="shoulder-btn"
            onTouchStart={() => handleButtonPress(name)}
            onTouchEnd={() => handleButtonRelease(name)}
            onMouseDown={() => handleButtonPress(name)}
            onMouseUp={() => handleButtonRelease(name)}
            onMouseLeave={() => handleButtonRelease(name)}
        >
            {label}
        </button>
    );

    if (side === 'left') {
        return (
            <div className="shoulder-group left">
                {renderButton('ZL', 'ZL')}
                {renderButton('L', 'L')}
            </div>
        );
    }

    if (side === 'right') {
        return (
            <div className="shoulder-group right">
                {renderButton('ZR', 'ZR')}
                {renderButton('R', 'R')}
            </div>
        );
    }

    return null;
}
