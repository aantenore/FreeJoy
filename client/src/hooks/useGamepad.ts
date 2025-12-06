import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionState, PlayerState } from '../types';

export function useGamepad(initialRoomId: string | null) {
    // REQUIREMENT: Use IP-based identification (server-side)
    // No need for client-side UUID generation anymore
    const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
        const stored = localStorage.getItem('ryujinx_last_room');
        return stored || initialRoomId;
    });

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
            // Server uses IP as clientId, so we only send roomId
            socket.emit('join', { roomId: activeRoomId });
        });

        // Auto-rejoin on reconnection
        socket.io.on('reconnect', () => {
            console.log('Reconnected! Rejoining room...');
            socket.emit('join', { roomId: activeRoomId });
        });

        // REQUIREMENT: Handle server-side redirect command
        socket.on('room_redirect', (data: { newRoomId: string }) => {
            console.log("Received Redirect to:", data.newRoomId);
            localStorage.setItem('ryujinx_last_room', data.newRoomId); // Persist correct room

            // Update Internal State -> Triggers useEffect re-run -> Reconnects to new room
            setActiveRoomId(data.newRoomId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err);
            setStatus('error');
            setErrorMsg('Network Warning: ' + err.message);
        });

        socket.on('joined', (data: { playerId: number; roomId: string }) => {
            console.log('Joined room:', data);
            localStorage.setItem('ryujinx_last_room', data.roomId); // Save successful connection
            setPlayer({ playerId: data.playerId, roomId: data.roomId });
            setStatus('connected');
        });

        socket.on('rescan_needed', () => {
            setStatus('room_invalid');
        });

        // Helper to attempt Auto-Healing via API
        const attemptAutoHeal = async () => {
            console.log("Attempting to Auto-Heal via API...");
            try {
                const res = await fetch('/api/room');
                const data = await res.json();
                if (data.roomId && data.roomId !== activeRoomId) {
                    console.log("Auto-Heal: Found new room", data.roomId);
                    localStorage.setItem('ryujinx_last_room', data.roomId);
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

    return { status, player, errorMsg, sendInput, activeRoomId };
}
