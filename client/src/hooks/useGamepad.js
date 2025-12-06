import { useState, useEffect, useCallback, useRef } from 'react';
import { createSocket } from '../utils/socket';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom hook for gamepad logic
 * @param {string} serverUrl - Server URL (optional)
 * @param {string} roomId - Room ID to join
 * @returns {Object}
 */
export function useGamepad(serverUrl, roomId) {
    const [playerId, setPlayerId] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [players, setPlayers] = useState([]);

    const socketRef = useRef(null);
    const clientIdRef = useRef(null);

    // Initialize client ID (persist across reconnections)
    useEffect(() => {
        const stored = localStorage.getItem('gamepad_client_id');
        if (stored) {
            clientIdRef.current = stored;
        } else {
            const newId = uuidv4();
            clientIdRef.current = newId;
            localStorage.setItem('gamepad_client_id', newId);
        }
    }, []);

    // Initialize socket connection
    useEffect(() => {
        if (!clientIdRef.current) return;

        const socket = createSocket(serverUrl);
        socketRef.current = socket;

        // Handle connection
        socket.on('connect', () => {
            setConnected(true);
            setError(null);

            // Join room
            const isReconnect = playerId !== null;
            socket.emit('join', {
                clientId: clientIdRef.current,
                roomId: roomId,
                reconnect: isReconnect,
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            setConnected(false);
        });

        // Handle player assignment
        socket.on('joined', (data) => {
            setPlayerId(data.playerId);
            console.log(`Assigned as Player ${data.playerId}`);
        });

        // Handle player updates
        socket.on('playerUpdate', (data) => {
            setPlayers(data.players);
        });

        // Handle errors
        socket.on('error', (data) => {
            setError(data.message);
            console.error('Server error:', data.message);
        });

        // Cleanup
        return () => {
            socket.disconnect();
        };
    }, [serverUrl, roomId]);

    // Send input to server
    const sendInput = useCallback((button, state) => {
        if (!socketRef.current || !connected) {
            return;
        }

        socketRef.current.emit('input', {
            btn: button,
            state: state,
        });
    }, [connected]);

    // Send ping
    const sendPing = useCallback(() => {
        if (socketRef.current && connected) {
            socketRef.current.emit('ping');
        }
    }, [connected]);

    // Ping interval
    useEffect(() => {
        if (!connected) return;

        const interval = setInterval(() => {
            sendPing();
        }, 15000); // Ping every 15 seconds (optimized from 5s)

        return () => clearInterval(interval);
    }, [connected, sendPing]);

    return {
        playerId,
        connected,
        error,
        players,
        sendInput,
    };
}
