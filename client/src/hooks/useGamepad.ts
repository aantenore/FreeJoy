import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionState, PlayerState } from '../types';

const CLIENT_ID_KEY = 'ryujinx_client_id';

export function useGamepad() {
    const [status, setStatus] = useState<ConnectionState>('connecting');
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const socketRef = useRef<Socket | null>(null);
    const clientIdRef = useRef<string>('');

    useEffect(() => {
        // 1. Get or Generate Client ID
        let storedId = localStorage.getItem(CLIENT_ID_KEY);
        if (!storedId) {
            storedId = uuidv4();
            localStorage.setItem(CLIENT_ID_KEY, storedId);
        }
        clientIdRef.current = storedId;

        // 2. Parse Room ID from URL
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room');

        if (!roomId) {
            setStatus('error');
            setErrorMsg('No Room ID provided in URL');
            return;
        }

        // 3. Connect to Socket.IO
        // Automatically uses window.location.origin in production, or localhost:8080 in dev via proxy if needed
        const serverUrl = import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin;

        // Connect
        const socket = io(serverUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server, joining room...');
            socket.emit('join', { clientId: storedId, roomId });
        });

        // Auto-rejoin on reconnection
        socket.io.on('reconnect', () => {
            console.log('Reconnected! Rejoining room...');
            socket.emit('join', { clientId: storedId, roomId });
        });

        socket.on('joined', (data: { playerId: number; roomId: string }) => {
            console.log('Joined room:', data);
            setPlayer({ playerId: data.playerId, roomId: data.roomId });
            setStatus('connected');
        });

        socket.on('error', (err: { code: string; message: string }) => {
            console.error('Socket Error:', err);
            if (err.code === 'ROOM_FULL') setStatus('room_full');
            else if (err.code === 'ROOM_CLOSED') setStatus('room_closed');
            else setStatus('error');

            setErrorMsg(err.message);
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
    }, []);

    const sendInput = useCallback((btn: string, state: 0 | 1) => {
        if (socketRef.current && status === 'connected') {
            // Haptic feedback logic
            if (state === 1 && navigator.vibrate) {
                navigator.vibrate(10);
            }
            socketRef.current.emit('input', { btn, state });
        }
    }, [status]);

    return { status, player, errorMsg, sendInput };
}
