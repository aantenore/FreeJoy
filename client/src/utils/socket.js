import { io } from 'socket.io-client';

/**
 * Create Socket.IO client
 * @param {string} serverUrl - Server URL (optional, defaults to current host)
 * @returns {Socket}
 */
export function createSocket(serverUrl) {
    const url = serverUrl || window.location.origin;

    const socket = io(url, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
    });

    // Log connection events
    socket.on('connect', () => {
        console.log('✓ Connected to server');
    });

    socket.on('disconnect', (reason) => {
        console.log('✗ Disconnected:', reason);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`✓ Reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`⟳ Reconnection attempt ${attemptNumber}...`);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    return socket;
}
