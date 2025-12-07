import React from 'react';
import './ActionButtons.css'; // Reuse action button styles for simplicity

export function DirectionalButtons({ onInput }) {
    const handlePress = (btn) => {
        onInput('DPad' + btn, 1); // Prefix DPad to distinguish from stick 'Up'
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleRelease = (btn) => {
        onInput('DPad' + btn, 0);
    };

    const buttons = [
        { name: 'Up', label: '▲', position: 'top' },
        { name: 'Right', label: '▶', position: 'right' },
        { name: 'Down', label: '▼', position: 'bottom' },
        { name: 'Left', label: '◀', position: 'left' },
    ];

    return (
        <div className="action-buttons dpad-buttons">
            {buttons.map(({ name, label, position }) => (
                <button
                    key={name}
                    className={`action-btn action-${position}`}
                    style={{ '--btn-color': '#00bfff' }} // Cyan for D-Pad
                    onTouchStart={(e) => { e.preventDefault(); handlePress(name); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleRelease(name); }}
                    onMouseDown={(e) => { e.preventDefault(); handlePress(name); }}
                    onMouseUp={(e) => { e.preventDefault(); handleRelease(name); }}
                    onMouseLeave={(e) => { e.preventDefault(); handleRelease(name); }}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
