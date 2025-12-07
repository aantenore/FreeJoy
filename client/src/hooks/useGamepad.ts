import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionState, PlayerState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useGamepad(initialRoomId: string | null) {
    // REMOVED localStorage - always use server-provided roomId (iOS compatibility)
    const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId);

    // Persistent Client ID (UUID)
    // Stored in localStorage to identify this device across reloads/restarts
    const getClientId = () => {
        let id = localStorage.getItem('freejoy_client_id');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('freejoy_client_id', id);
        }
        return id;
    };
    const clientId = useRef(getClientId()).current;

    // Sync prop changes (e.g. from Auto-Discovery) to internal state
    useEffect(() => {
        if (initialRoomId && initialRoomId !== activeRoomId) {
            console.log("Syncing Room ID from prop:", initialRoomId);
            setActiveRoomId(initialRoomId);
        }
    }, [initialRoomId]);

    const [status, setStatus] = useState<ConnectionState>('connecting');
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!activeRoomId) {
            setStatus('error');
            setErrorMsg('No Room ID provided');
            return;
        }

        // Connect to Socket.IO
        // Server will identify client by IP address
        const serverUrl = import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin;
        const socket = io(serverUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server, joining room...', activeRoomId);

            // Parse desired slot from URL query param
            const params = new URLSearchParams(window.location.search);
            const slotParam = params.get('slot');
            const desiredSlot = slotParam ? parseInt(slotParam, 10) : undefined;

            console.log("Joining with desire:", desiredSlot);

            // Send persistence ID and Desired Slot
            socket.emit('join', {
                roomId: activeRoomId,
                clientId: clientId,
                desiredSlot: desiredSlot
            });
        });

        // ... (rest of listeners: reconnect, room_redirect, connect_error, joined, etc.)
        // Keep existing logic ...

        socket.io.on('reconnect', () => {
            console.log('Reconnected! Rejoining room...');
            const params = new URLSearchParams(window.location.search);
            const slotParam = params.get('slot');
            const desiredSlot = slotParam ? parseInt(slotParam, 10) : undefined;
            socket.emit('join', { roomId: activeRoomId, clientId: clientId, desiredSlot });
        });

        socket.on('room_redirect', (data: { newRoomId: string }) => {
            console.log("Received Redirect to:", data.newRoomId);
            // Update Internal State -> Triggers useEffect re-run -> Reconnects to new room
            setActiveRoomId(data.newRoomId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err);
            setStatus('error');
            setErrorMsg('Network Warning: ' + err.message);
        });

        socket.on('joined', (data: { playerId: number; roomId: string; profile?: any }) => {
            console.log('Joined room:', data);
            setPlayer({ playerId: data.playerId, roomId: data.roomId, profile: data.profile });
            setStatus('connected');
        });

        socket.on('rescan_needed', () => {
            setStatus('room_invalid');
        });

        // Helper to attempt Auto-Healing via API
        const attemptAutoHeal = async () => {
            console.log("Attempting to Auto-Heal via API...");
            try {
                // Add timestamp to prevent iOS caching
                const res = await fetch(`/api/room?t=${Date.now()}`);
                const data = await res.json();
                if (data.roomId && data.roomId !== activeRoomId) {
                    console.log("Auto-Heal: Found new room", data.roomId);
                    setActiveRoomId(data.roomId); // Triggers reconnect
                    return true;
                }
            } catch (e) {
                console.error("Auto-Heal failed:", e);
            }
            return false;
        };

        socket.on('error', (err: { code: string; message: string }) => {
            console.error('Socket Error:', err);

            // Critical Errors: Try to Auto-Heal
            if (err.code === 'ROOM_CLOSED' || err.code === 'ROOM_FULL' || err.code === 'INVALID_ROOM') {
                setStatus('error'); // Temporary state
                attemptAutoHeal().then(success => {
                    if (!success) {
                        // Only show fatal error if healing failed
                        if (err.code === 'ROOM_FULL') setStatus('room_full');
                        else if (err.code === 'ROOM_CLOSED') setStatus('room_closed');
                        else setStatus('error');
                        setErrorMsg(err.message + " (Auto-heal failed)");
                    }
                });
            } else {
                setStatus('error');
                setErrorMsg(err.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected');
            if (status !== 'room_closed' && status !== 'room_full') {
                setStatus('disconnected');
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [activeRoomId]);

    const sendInput = useCallback((btn: string, state: 0 | 1) => {
        if (socketRef.current && status === 'connected') {
            // Haptic feedback logic
            if (state === 1 && navigator.vibrate) {
                navigator.vibrate(10);
            }
            socketRef.current.emit('input', { btn, state });
        }
    }, [status]);

    // New Analog Input Function
    const sendAnalog = useCallback((stick: 'left' | 'right', x: number, y: number) => {
        if (socketRef.current && status === 'connected') {
            socketRef.current.emit('analog', { stick, x, y });
        }
    }, [status]);

    return { status, player, errorMsg, sendInput, sendAnalog, activeRoomId };
}
