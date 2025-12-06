import React, { useEffect, useState } from 'react';
import QRCode from "react-qr-code";
import { useGamepad } from './hooks/useGamepad';
import { Controller } from './components/Controller';
import './App.css';

/**
 * Main App Component
 */
function App() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const [hostRoom, setHostRoom] = useState(null);

    // Mode: "gamepad" if room is in URL, else "host"
    const mode = roomParam ? 'gamepad' : 'host';

    // HOST MODE FETCH
    useEffect(() => {
        if (mode === 'host') {
            fetch('/api/room')
                .then(res => res.json())
                .then(data => setHostRoom(data))
                .catch(err => console.error("Failed to fetch room info", err));
        }
    }, [mode]);

    if (mode === 'host') {
        if (!hostRoom) return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white relative overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy"></div>

                {/* Joy-Con splash */}
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <div className="flex gap-6 mb-8">
                        <div className="w-16 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-2xl transform -rotate-12 animate-bounce"></div>
                        <div className="w-16 h-32 bg-gradient-to-br from-red-400 to-pink-600 rounded-2xl shadow-2xl transform rotate-12 animate-bounce animation-delay-300"></div>
                    </div>
                    <p className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                        FREEJOY
                    </p>
                    <p className="text-lg font-medium text-slate-300 mt-2">Initializing Host...</p>
                </div>
            </div>
        );

        const serverIp = hostRoom.serverIp || window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const joinUrl = `${protocol}//${serverIp}${port}/?room=${hostRoom.roomId}`;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900">
                {/* Premium Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                {/* Floating Orbs for extra premium feel */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex flex-col items-center w-full max-w-md p-6">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 drop-shadow-lg mb-2">
                            SWITCH
                        </h1>
                        <p className="text-xl font-light tracking-widest text-white/80 uppercase">
                            Gamepad Server
                        </p>
                    </div>

                    {/* Glassmorphism Card with Splash Animation */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center transform transition-all hover:scale-105 duration-300 animate-fadeIn">
                        {/* Joy-Con Icons */}
                        <div className="flex gap-4 mb-6">
                            <div className="w-12 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg shadow-lg transform -rotate-12 animate-pulse"></div>
                            <div className="w-12 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg shadow-lg transform rotate-12 animate-pulse animation-delay-300"></div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-inner">
                            <QRCode
                                value={joinUrl}
                                size={220}
                                level="H"
                                fgColor="#1e293b"
                            />
                        </div>
                    </div>

                    {/* Instructions & URL */}
                    <div className="mt-10 text-center space-y-6 w-full">
                        <div className="space-y-2">
                            <p className="text-white/60 text-sm uppercase tracking-wider font-semibold">Scan to Connect</p>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-green-400 font-medium text-sm">Room Active</span>
                            </div>
                        </div>

                        <div className="group relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex items-center justify-between bg-slate-950 rounded-lg p-4 border border-white/10">
                                <code className="font-mono text-blue-400 text-sm truncate mr-4">
                                    {joinUrl}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                                    className="p-2 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white"
                                    title="Copy URL"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                            Ensure your device is connected to the same Wi-Fi network.
                            <br />
                            Supports iOS & Android.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 text-white/20 text-xs font-mono">
                    v2.0.0 • Ephemeral Session
                </div>
            </div>
        );
    }

    return <GamepadView serverUrl={window.location.origin} roomId={roomParam} />;
}

function GamepadView({ serverUrl, roomId }) {
    const { playerId, connected, error, sendInput } = useGamepad(serverUrl, roomId);

    useEffect(() => {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => console.log('Orientation lock failed:', err));
        }
    }, []);

    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Show splash for minimum 2 seconds
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) { console.log('WakeLock error:', err); }
        };
        requestWakeLock();
        return () => { if (wakeLock) wakeLock.release(); };
    }, []);

    if (showSplash || (!connected && !error)) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>

                {/* Joy-Con splash */}
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <div className="flex gap-6 mb-8">
                        <div className="w-16 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-2xl transform -rotate-12 animate-bounce"></div>
                        <div className="w-16 h-32 bg-gradient-to-br from-red-400 to-pink-600 rounded-2xl shadow-2xl transform rotate-12 animate-bounce animation-delay-300"></div>
                    </div>
                    <p className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                        FREEJOY
                    </p>
                    <p className="text-lg font-medium text-slate-300 mt-2">Connecting to Switch...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
                <p className="text-white/60 mb-6 max-w-xs">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/50"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!playerId) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <div className="loading-spinner mb-4 border-indigo-500 border-t-transparent"></div>
                <p className="animate-pulse">Waiting for slot...</p>
            </div>
        );
    }

    return (
        <div className="app bg-slate-950 h-screen w-screen overflow-hidden overscroll-none touch-none">
            <Controller playerId={playerId} onInput={sendInput} />
            <div className={`connection-status ${connected ? 'connected' : 'disconnected'} fixed top-4 right-4`}>
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
            </div>
        </div>
    );
}

export default App;
