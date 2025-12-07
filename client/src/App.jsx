import React, { useEffect, useState } from 'react';
import QRCode from "react-qr-code";
import { useGamepad } from './hooks/useGamepad';
import { Controller } from './components/Controller';
import { InstallBanner } from './components/InstallBanner';
import './App.css';

/**
 * Main App Component
 */
function App() {
    const [mode, setMode] = useState('loading'); // 'loading' | 'host' | 'gamepad'
    const [activeRoom, setActiveRoom] = useState(null);
    const [hostRoom, setHostRoom] = useState(null);

    // Initial Routing Logic
    useEffect(() => {
        const path = window.location.pathname;

        // ROUTE: /pad -> Gamepad Mode (Stateless)
        if (path === '/pad') {
            // Fetch Room ID immediately
            fetch('/api/room')
                .then(res => res.json())
                .then(data => {
                    if (data.roomId) {
                        console.log("Stateless Init: Found active room", data.roomId);
                        setActiveRoom(data.roomId);
                        setMode('gamepad');
                    } else {
                        // Fallback if no room active (e.g. server just started but room not init? Unlikely)
                        console.error("No active room found via API");
                        setMode('error');
                    }
                })
                .catch(err => {
                    console.error("Failed to init gamepad", err);
                    setMode('error');
                });
        }
        // ROUTE: / (root) -> Host Mode
        else {
            setMode('host');
        }
    }, []);

    // HOST MODE FETCH
    useEffect(() => {
        if (mode === 'host') {
            fetch('/api/room')
                .then(res => res.json())
                .then(data => setHostRoom(data))
                .catch(err => console.error("Failed to fetch room info", err));
        }
    }, [mode]);

    if (mode === 'loading') {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    }

    if (mode === 'error') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Service Unavailable</h2>
                <p className="text-white/60 mb-6">Could not connect to the Gamepad Server.</p>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 rounded-lg font-bold">Retry</button>
            </div>
        )
    }

    if (mode === 'host') {
        if (!hostRoom) return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy"></div>
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <p className="text-xl font-bold">Initializing Server...</p>
                </div>
            </div>
        );

        const serverIp = hostRoom.serverIp || window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        // Requirement: QR Code URL points to /pad
        const joinUrl = `${protocol}//${serverIp}${port}/pad`;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900">
                {/* Premium Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                {/* Floating Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex flex-col items-center w-full max-w-md p-6">
                    <div className="text-center mb-8">
                        <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 drop-shadow-lg mb-2">FREEJOY</h1>
                        <p className="text-xl font-light tracking-widest text-white/80 uppercase">Wireless Gamepad</p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center transform transition-all hover:scale-105 duration-300 animate-fadeIn">
                        <div className="flex gap-4 mb-6">
                            <div className="w-12 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg shadow-lg transform -rotate-12 animate-pulse"></div>
                            <div className="w-12 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg shadow-lg transform rotate-12 animate-pulse animation-delay-300"></div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-inner">
                            <QRCode value={joinUrl} size={220} level="H" fgColor="#1e293b" />
                        </div>
                    </div>

                    <div className="mt-10 text-center space-y-6 w-full">
                        <div className="space-y-2">
                            <p className="text-white/60 text-sm uppercase tracking-wider font-semibold">Scan to Connect</p>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-green-400 font-medium text-sm">Room Active</span>
                            </div>
                        </div>

                        <div className="group relative">
                            <div className="relative flex items-center justify-between bg-slate-950 rounded-lg p-4 border border-white/10 justify-center">
                                <code className="font-mono text-blue-400 text-sm truncate">{joinUrl}</code>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Fallback & Footer */}
                <div className="absolute bottom-6 text-white/20 text-xs font-mono flex flex-col items-center gap-2">
                    <span>v2.1.0 • Stateless Architecture</span>
                    {/* Manual Override Button incase someone hits root on phone */}
                    <a href="/pad" className="text-white/40 hover:text-white underline">
                        Open Gamepad
                    </a>
                </div>
            </div>
        );
    }

    return <GamepadView roomId={activeRoom} />;
}

function GamepadView({ roomId }) {
    const { status, player, errorMsg, sendInput, activeRoomId } = useGamepad(roomId);

    // Derive Flattened Props
    const playerId = player?.playerId;
    const connected = status === 'connected';
    const error = errorMsg;

    const [showSplash, setShowSplash] = useState(true);
    const [isLongConnection, setIsLongConnection] = useState(false);

    useEffect(() => {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => console.log('orientation err', err));
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let timeout;
        if (status === 'connecting' && !showSplash) {
            timeout = setTimeout(() => setIsLongConnection(true), 8000);
        } else {
            setIsLongConnection(false);
        }
        return () => clearTimeout(timeout);
    }, [status, showSplash]);

    // Wake Lock
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
        };
        requestWakeLock();
        return () => { if (wakeLock) wakeLock.release(); };
    }, []);

    if (showSplash || (status === 'connecting')) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>
                {!isLongConnection ? (
                    <div className="relative z-10 flex flex-col items-center animate-pulse">
                        <div className="flex gap-6 mb-8">
                            <div className="w-16 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-2xl transform -rotate-12 animate-bounce"></div>
                            <div className="w-16 h-32 bg-gradient-to-br from-red-400 to-pink-600 rounded-2xl shadow-2xl transform rotate-12 animate-bounce animation-delay-300"></div>
                        </div>
                        <p className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">FREEJOY</p>
                        <p className="text-lg font-medium text-slate-300 mt-2">Connecting to {activeRoomId || roomId}...</p>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col items-center text-center p-6 backdrop-blur-md bg-black/30 rounded-xl">
                        <h2 className="text-xl mb-4 text-orange-400 opacity-90">Connection Timeout</h2>
                        <p className="mb-4 text-sm opacity-70">Room: {activeRoomId || roomId}</p>
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 rounded-lg font-bold shadow-lg">Retry</button>
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
                <p className="text-white/60 mb-6 max-w-xs">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-blue-600 rounded-lg">Retry Connection</button>
            </div>
        );
    }

    if (!playerId) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="loading-spinner mb-4 border-indigo-500 border-t-transparent"></div>
                <p className="animate-pulse text-xl font-bold mb-4">Waiting for slot...</p>
                <p className="text-sm opacity-50">Room: {activeRoomId || roomId}</p>

                <button
                    onClick={() => {
                        window.location.reload();
                    }}
                    className="mt-6 px-4 py-2 bg-red-800/50 hover:bg-red-800 rounded text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="app bg-slate-950 h-screen w-screen overflow-hidden overscroll-none touch-none">
            <Controller playerId={playerId} onInput={sendInput} />
            {/* Connection status hidden for cleaner UI - status visible in center LEDs */}
            <div className="hidden">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
            </div>
            <InstallBanner />
        </div>
    );
}

export default App;
