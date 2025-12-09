import React, { useState, useRef, useEffect } from 'react';
import './DPad.css';

/**
 * Analog Stick Component (Gamepad Style)
 * Draggable stick that follows finger/mouse movement
 * Supports 'prefix' for differentiating Left/Right sticks
 * Supports 'clickButton' for L3/R3 functionality via tap
 */
export function DPad({ onInput, clickButton, prefix = '' }) {
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const padRef = useRef(null);
    const activeDirection = useRef(null);
    const startTime = useRef(0);
    const startPos = useRef({ x: 0, y: 0 });

    const maxDistance = 35; // Maximum stick displacement from center

    const handleStart = (e) => {
        if (e.cancelable) e.preventDefault();
        setIsDragging(true);
        startTime.current = Date.now();

        const touch = e.touches ? e.touches[0] : e;
        startPos.current = { x: touch.clientX, y: touch.clientY };

        updateStickPosition(e);
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        updateStickPosition(e);
    };

    const handleEnd = (e) => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });

        // Tap Detection for L3/R3
        const duration = Date.now() - startTime.current;

        // If short duration and no direction triggered (approx stationary tap)
        if (duration < 250 && !activeDirection.current && clickButton) {
            onInput(clickButton, 1);
            setTimeout(() => onInput(clickButton, 0), 100);
            if (navigator.vibrate) navigator.vibrate(20);
        }

        if (activeDirection.current) {
            onInput(prefix + activeDirection.current, 0);
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

        // Deadzone of 10px
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            direction = null;
        } else if (angle >= -45 && angle < 45) {
            direction = 'Right';
        } else if (angle >= 45 && angle < 135) {
            direction = 'Down';
        } else if (angle >= -135 && angle < -45) {
            direction = 'Up';
        } else {
            direction = 'Left';
        }

        // Send input
        if (direction !== activeDirection.current) {
            // Release old direction
            if (activeDirection.current) {
                onInput(prefix + activeDirection.current, 0);
            }
            // Press new direction
            if (direction) {
                onInput(prefix + direction, 1);
            }
            activeDirection.current = direction;
        }
    };

    useEffect(() => {
        const handleGlobalMove = (e) => handleMove(e);
        const handleGlobalEnd = (e) => handleEnd(e);

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
