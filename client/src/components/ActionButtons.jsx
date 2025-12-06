import React from 'react';
import './ActionButtons.css';

/**
 * Action Buttons Component
 * A/B/X/Y action buttons
 */
export function ActionButtons({ onInput }) {
    const handleButtonPress = (button) => {
        onInput(button, 1);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleButtonRelease = (button) => {
        onInput(button, 0);
    };

    // Generic button colors or specific theme colors
    const buttons = [
        { name: 'X', position: 'top', color: '#fff' }, // Usually white/gray letter on black btn
        { name: 'A', position: 'right', color: '#fff' },
        { name: 'B', position: 'bottom', color: '#fff' },
        { name: 'Y', position: 'left', color: '#fff' },
    ];

    // OVERRIDE: Actually, let's keep the user's "Neon" request.
    // However, real JoyCons have black buttons with white text.
    // If we want "Neon", maybe we make the button GLOW the neon color when pressed?
    // Let's use generic white for now, but let CSS highlight them creatively.
    // Wait, implementation plan said "glossy button effects". 
    // I made the CSS use var(--btn-color). Let's give them distinct neon colors for the GLOW.
    const neonButtons = [
        { name: 'X', position: 'top', color: '#ffff00' }, // Yellowish
        { name: 'A', position: 'right', color: '#00ff00' }, // Greenish
        { name: 'B', position: 'bottom', color: '#ff0000' }, // Red
        { name: 'Y', position: 'left', color: '#00ffff' }, // Cyan
    ];
    // ABXY buttons styled minimally
    // But for a "Neon" UI, let's use the colors I defined in CSS var for maximum "Wow".

    return (
        <div className="action-buttons">
            {neonButtons.map(({ name, position, color }) => (
                <button
                    key={name}
                    className={`action-btn action-${position}`}
                    style={{ '--btn-color': color }}
                    onTouchStart={() => handleButtonPress(name)}
                    onTouchEnd={() => handleButtonRelease(name)}
                    onMouseDown={() => handleButtonPress(name)}
                    onMouseUp={() => handleButtonRelease(name)}
                    onMouseLeave={() => handleButtonRelease(name)}
                >
                    {name}
                </button>
            ))}
        </div>
    );
}
