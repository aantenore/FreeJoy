import React, { useEffect, useState } from 'react';
import QRCode from "react-qr-code";
import { ProController } from './components/ProController';
import { InstallBanner } from './components/InstallBanner';
import io from 'socket.io-client';
import './App.css';

/**
 * Main App Component
 */
function App() {
    const [mode, setMode] = useState('loading'); // 'loading' | 'host' | 'gamepad'
    const [activeRoom, setActiveRoom] = useState(null);
    const [hostRoom, setHostRoom] = useState(null);
    const [players, setPlayers] = useState([]);

    // Initial Routing Logic
    useEffect(() => {
        const path = window.location.pathname;

        // ROUTE: /pad -> Gamepad Mode (Stateless)
        if (path === '/pad') {
            // Fetch Room ID immediately
            fetch(`/api/room?t=${Date.now()}`)
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

    // WebSocket for players list (host mode only)
    useEffect(() => {
        if (mode === 'host') {
            const socket = io();
            setHostSocket(socket);
            socket.on('players_list', (list) => {
                setPlayers(list);
            });
            socket.emit('get_players'); // Request initial list
            return () => socket.disconnect();
        }
    }, [mode]);

    const [hostSocket, setHostSocket] = useState(null);

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
        if (!hostRoom) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy"></div><div className="relative z-10 flex flex-col items-center animate-pulse"><p className="text-xl font-bold">Initializing Server...</p></div></div>;

        // Use server-detected IP from API response
        const serverIp = hostRoom.serverIp;
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const baseUrl = `${protocol}//${serverIp}${port}/pad`;

        // Single QR code for Pro Controller with auto-assignment
        const qrCodeUrl = `${baseUrl}?type=pro`;

        return (
            <div className="h-screen w-full flex flex-col items-center relative overflow-y-auto bg-slate-900 p-4 pb-20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Background FX */}
                <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-black animate-gradient-xy pointer-events-none"></div>
                <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>

                {/* Header */}
                <div className="relative z-10 text-center mb-8 mt-12 px-12 overflow-visible">
                    <h1 className="text-6xl font-black tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#FF4D6D] drop-shadow-lg mb-2 italic overflow-visible whitespace-nowrap pr-4">FREEJOY</h1>
                    <p className="text-xs font-bold tracking-[0.6em] text-white/40 uppercase">Scan to Connect</p>
                </div>

                {/* QR Code + Players List - Side by Side */}
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 w-full max-w-6xl items-start justify-center">
                    {/* QR Code */}
                    <a
                        href={qrCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative backdrop-blur-xl bg-amber-950/40 border border-amber-400 
                            p-8 rounded-[2rem] flex flex-col items-center 
                            shadow-amber-500/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]
                            transition-all duration-300 hover:-translate-y-2 cursor-pointer
                            w-full sm:w-96 shrink-0"
                    >
                        <h3 className="text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-br from-amber-400 to-orange-600 mb-8 drop-shadow-sm">
                            Join
                        </h3>
                        <div className="bg-white p-4 rounded-2xl shadow-inner border-[6px] border-white/10">
                            <QRCode value={qrCodeUrl} size={220} level="M" fgColor="#0f172a" />
                        </div>
                        <div className="mt-6 px-6 py-2 rounded-full border border-amber-400 bg-black/40 text-xs font-bold text-white uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-colors">
                            Scan to Join (Auto-Assigned)
                        </div>
                        <p className="mt-4 text-white/50 text-sm text-center">
                            Players will be assigned slots 1-4 automatically
                        </p>
                    </a>

                    {/* Connected Players List */}
                    <div className="flex-1 w-full">
                        <h2 className="text-2xl font-bold text-white/80 mb-4">Connected Players</h2>
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                            {players.length === 0 ? (
                                <p className="text-white/40 text-sm text-center py-8">No players connected yet...</p>
                            ) : (
                                <div className="space-y-3">
                                    {players.map((player) => (
                                        <div
                                            key={player.playerId}
                                            className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${player.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    P{player.playerId}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">{player.deviceName || `Player ${player.playerId}`}</p>
                                                    <p className={`text-sm ${player.connected ? 'text-green-400' : 'text-red-400'}`}>
                                                        {player.connected ? 'Connected' : 'Disconnected'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (hostSocket) {
                                                        hostSocket.emit('kick_player', { playerId: player.playerId });
                                                    }
                                                }}
                                                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold transition-colors active:scale-95"
                                            >
                                                Kick
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Footer with Reset Button */}
                <div className="relative z-10 mt-12 flex flex-col items-center gap-4">
                    <button
                        onClick={() => {
                            if (confirm('Reset room? All players will be disconnected and the ban list will be cleared.')) {
                                if (hostSocket) {
                                    hostSocket.emit('reset_room');
                                    hostSocket.on('room_reset_complete', () => {
                                        alert('Room reset complete!');
                                    });
                                }
                            }
                        }}
                        className="px-6 py-3 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-lg font-bold transition-colors active:scale-95 border border-yellow-400"
                    >
                        🔄 Reset Room
                    </button>

                    <div className="text-white/20 text-xs font-mono text-center">
                        <p>Server running at:</p>
                        <p className="select-all">{baseUrl}</p>
                    </div>
                </div>
            </div>
        );
    }

    // GAMEPAD MODE
    // All connections now use Pro Controller layout
    return <ProController roomId={activeRoom} />;
}

export default App;
