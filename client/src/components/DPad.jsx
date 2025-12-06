import React, { useState, useRef, useEffect } from 'react';
import './DPad.css';

/**
 * Analog Stick Component (Joy-Con Style)
 * Draggable stick that follows finger/mouse movement
 */
export function DPad({ onInput }) {
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const padRef = useRef(null);
    const activeDirection = useRef(null);
    const lastEmitTime = useRef(0);
    const THROTTLE_MS = 16; // 60Hz max (1000ms / 60 = ~16ms)

    const maxDistance = 35; // Maximum stick displacement from center

    const handleStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        updateStickPosition(e);

        // Enhanced haptic feedback on grab
        if (navigator.vibrate) {
            navigator.vibrate(15); // Slightly stronger for analog stick
        }
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        updateStickPosition(e);
    };

    const handleEnd = () => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });

        if (activeDirection.current) {
            onInput(activeDirection.current, 0);
            activeDirection.current = null;
        }
    };

    const updateStickPosition = (e) => {
        if (!padRef.current) return;

        const touch = e.touches ? e.touches[0] : e;
        const rect = padRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;

        // Limit stick movement to maxDistance
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDistance;
            deltaY = Math.sin(angle) * maxDistance;
        }

        setStickPos({ x: deltaX, y: deltaY });

        // Determine direction based on angle
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        let direction = null;

        if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
            direction = null; // Dead zone
        } else if (angle >= -45 && angle < 45) {
            direction = 'Right';
        } else if (angle >= 45 && angle < 135) {
            direction = 'Down';
        } else if (angle >= -135 && angle < -45) {
            direction = 'Up';
        } else {
            direction = 'Left';
        }

        // Send input only when direction changes
        if (direction !== activeDirection.current) {
            if (activeDirection.current) {
                onInput(activeDirection.current, 0);
            }
            if (direction) {
                onInput(direction, 1);
            }
            activeDirection.current = direction;
        }
    };

    useEffect(() => {
        const handleGlobalMove = (e) => handleMove(e);
        const handleGlobalEnd = () => handleEnd();

        if (isDragging) {
            document.addEventListener('mousemove', handleGlobalMove);
            document.addEventListener('mouseup', handleGlobalEnd);
            document.addEventListener('touchmove', handleGlobalMove);
            document.addEventListener('touchend', handleGlobalEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMove);
            document.removeEventListener('mouseup', handleGlobalEnd);
            document.removeEventListener('touchmove', handleGlobalMove);
            document.removeEventListener('touchend', handleGlobalEnd);
        };
    }, [isDragging]);

    return (
        <div
            ref={padRef}
            className="analog-stick"
            onTouchStart={handleStart}
            onMouseDown={handleStart}
        >
            <div className="analog-rim"></div>
            <div
                className={`analog-center ${isDragging ? 'active' : ''}`}
                style={{
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`
                }}
            >
                <div className="analog-dot"></div>
            </div>
        </div>
    );
}
