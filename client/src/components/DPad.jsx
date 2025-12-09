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
    const activeTouchId = useRef(null); // Track the specific finger ID

    const maxDistance = 35; // Maximum stick displacement from center

    const handleStart = (e) => {
        // If already dragging, ignore new touches on the stick area
        if (isDragging) return;

        if (e.cancelable) e.preventDefault();
        setIsDragging(true);
        startTime.current = Date.now();

        let clientX, clientY;
        if (e.changedTouches) {
            const touch = e.changedTouches[0];
            activeTouchId.current = touch.identifier;
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            // Mouse event
            activeTouchId.current = 'mouse';
            clientX = e.clientX;
            clientY = e.clientY;
        }

        startPos.current = { x: clientX, y: clientY };

        // Immediate update on start
        updateStickPosition(clientX, clientY);
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        let clientX, clientY;

        if (activeTouchId.current === 'mouse') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            // Find the active touch
            const touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId.current);
            if (!touch) return; // This event doesn't involve our stick finger
            clientX = touch.clientX;
            clientY = touch.clientY;
        }

        updateStickPosition(clientX, clientY);
    };

    const handleEnd = (e) => {
        if (!isDragging) return;

        // Check if the ending event is for our stick
        if (activeTouchId.current !== 'mouse') {
            const touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId.current);
            if (!touch) return; // Not our finger lifting
        }

        // Reset
        setIsDragging(false);
        activeTouchId.current = null;
        setStickPos({ x: 0, y: 0 });

        if (onAnalog) {
            const stickName = prefix.startsWith('RS') ? 'right' : 'left';
            onAnalog(stickName, 0, 0);
        }

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

    const updateStickPosition = (clientX, clientY) => {
        if (!padRef.current) return;

        const rect = padRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        // Limit stick movement to maxDistance
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDistance;
            deltaY = Math.sin(angle) * maxDistance;
        }

        setStickPos({ x: deltaX, y: deltaY });

        // === ANALOG OUTPUT ===
        if (onAnalog) {
            // Normalize to -1.0 -> 1.0 range
            // Y is usually inverted for gamepads (Up = negative), but let's check standard.
            // Usually Up is -1.0 in HTML canvas, but Gamepads often use Up = -1.0.
            // Let's standardise: Right = +X, Down = +Y.
            const normX = deltaX / maxDistance;
            const normY = deltaY / maxDistance;

            // Determine stick name based on prefix
            const stickName = prefix.startsWith('RS') ? 'right' : 'left';

            // Throttle or send? React state updates are fast. 
            // The parent likely throttles or socket emits directly.
            onAnalog(stickName, normX, normY);
            return; // Skip digital logic
        }

        // === DIGITAL FALLBACK ===
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
            document.addEventListener('touchmove', handleGlobalMove, { passive: false });
            document.addEventListener('touchend', handleGlobalEnd);
            document.addEventListener('touchcancel', handleGlobalEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMove);
            document.removeEventListener('mouseup', handleGlobalEnd);
            document.removeEventListener('touchmove', handleGlobalMove);
            document.removeEventListener('touchend', handleGlobalEnd);
            document.removeEventListener('touchcancel', handleGlobalEnd);
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
