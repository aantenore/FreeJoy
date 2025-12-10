import { useEffect, useRef, useState } from "react";
import { clsx } from 'clsx';
import { Joystick } from 'react-joystick-component';
import io, { Socket } from 'socket.io-client';

export function ProController({ roomId }: { roomId: string }) {
    const [status, setStatus] = useState('connecting');
    const [playerId, setPlayerId] = useState<number | null>(null);
    const socket = useRef<Socket | null>(null);

    // === SOCKET CONNECTION LOGIC ===
    useEffect(() => {
        const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

        // Single socket connection with auto-assigned player ID
        const s = io(url, { reconnectionAttempts: 5 });

        s.on('connect', () => {
            console.log("Pro Controller: Socket Connected");
            // Generate unique client ID for this device
            const clientId = localStorage.getItem('clientId') || `pro-${Date.now()}`;
            localStorage.setItem('clientId', clientId);
            s.emit('join', { roomId, clientId });
        });

        s.on('joined', (data: { playerId: number }) => {
            console.log("Pro Controller: Joined as Player", data.playerId);
            setPlayerId(data.playerId);
            setStatus('connected');
        });

        s.on('disconnect', () => setStatus('disconnected'));
        s.on('error', (err: any) => {
            console.error("Connection error:", err);
            setStatus('error');
        });

        socket.current = s;

        return () => {
            s.disconnect();
        };
    }, [roomId]);

    // === INPUT HANDLERS ===
    const sendInput = (btn: string, state: 0 | 1) => {
        if (socket.current && socket.current.connected) {
            socket.current.emit('input', { btn, state });
            // Haptic feedback
            if (state === 1 && navigator.vibrate) navigator.vibrate(10);
        }
    };

    const sendAnalog = (stick: 'left' | 'right', x: number, y: number) => {
        if (socket.current && socket.current.connected) {
            socket.current.emit('analog', { stick, x, y });
        }
    };

    // Prevent context menu
    useEffect(() => {
        const handler = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', handler);
        return () => document.removeEventListener('contextmenu', handler);
    }, []);

    // Loading/Error states
    if (status === 'connecting' || !playerId) {
        return (
            <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-xl font-bold">Connecting to Room...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="text-2xl font-bold text-red-400 mb-4">Connection Error</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 rounded-lg font-bold">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-dvh bg-slate-900 flex flex-col overflow-hidden select-none touch-none">
            {/* === CONNECTION STATUS BAR === */}
            <div className="h-8 bg-black/40 flex items-center justify-between px-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        "w-3 h-3 rounded-full shadow-lg",
                        status === 'connected' ? "bg-green-400" : "bg-red-400 animate-pulse"
                    )} />
                    <span className="text-white/60 text-sm font-mono">Player {playerId}</span>
                </div>
                <div className="text-white/40 text-xs font-mono">Join the Party</div>
            </div>

            {/* === CONTROLLER LAYOUT === */}
            <div className="flex-1 flex flex-row">
                {/* === LEFT SIDE === */}
                <div className="flex-1 bg-gradient-to-br from-[#00C3E3] to-[#0088A3] p-2 flex flex-col justify-between relative border-r border-black/20">
                    {/* Top Row: L / ZL / Minus */}
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex gap-2">
                            <ShoulderBtn label="ZL" onInput={sendInput} />
                            <ShoulderBtn label="L" onInput={sendInput} />
                        </div>
                        <RoundBtn label="Minus" icon="−" onInput={sendInput} />
                    </div>

                    {/* Main: Stick (Top) + DPad (Bottom) */}
                    <div className="flex-1 flex flex-col items-center justify-evenly w-full">
                        {/* Left Stick */}
                        <div className="relative p-2 bg-black/10 rounded-full border border-white/5">
                            <Joystick
                                size={80}
                                stickSize={50}
                                baseColor="rgba(0,0,0,0.3)"
                                stickColor="#222"
                                throttle={30}
                                move={(e: any) => sendAnalog('left', (e.x || 0) / 40, -(e.y || 0) / 40)}
                                stop={() => sendAnalog('left', 0, 0)}
                            />
                            {/* L3 tucked in corner */}
                            <div className="absolute -top-4 -right-4 transform scale-75">
                                <RoundBtn label="L3" icon="L3" onInput={sendInput} />
                            </div>
                        </div>

                        {/* D-Pad */}
                        <div className="transform scale-90">
                            <DPadCluster onInput={sendInput} />
                        </div>
                    </div>
                </div>

                {/* === CENTER STRIP === */}
                <div className="w-8 bg-black flex flex-col items-center justify-center gap-4 border-x border-white/10 z-10 shadow-xl">
                    <div className="text-white/20 font-bold vertical-text text-[10px] tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        P{playerId}
                    </div>
                </div>

                {/* === RIGHT SIDE === */}
                <div className="flex-1 bg-gradient-to-br from-[#FF4554] to-[#C41E3A] p-2 flex flex-col justify-between relative border-l border-black/20">
                    {/* Top Row: R / ZR / Plus */}
                    <div className="flex justify-between items-start mb-1 flex-row-reverse">
                        <div className="flex gap-1">
                            <ShoulderBtn label="R" onInput={sendInput} />
                            <ShoulderBtn label="ZR" onInput={sendInput} />
                        </div>
                        <RoundBtn label="Plus" icon="+" onInput={sendInput} />
                    </div>

                    {/* Main: Buttons (Top) + Stick (Bottom) */}
                    <div className="flex-1 flex flex-col items-center justify-evenly w-full">
                        {/* ABXY */}
                        <div className="transform scale-90">
                            <ABXYCluster onInput={sendInput} />
                        </div>

                        {/* Right Stick */}
                        <div className="relative p-2 bg-black/10 rounded-full border border-white/5">
                            <Joystick
                                size={80}
                                stickSize={50}
                                baseColor="rgba(0,0,0,0.3)"
                                stickColor="#222"
                                throttle={30}
                                move={(e: any) => sendAnalog('right', (e.x || 0) / 40, -(e.y || 0) / 40)}
                                stop={() => sendAnalog('right', 0, 0)}
                            />
                            {/* R3 tucked in corner */}
                            <div className="absolute -top-4 -left-4 transform scale-75">
                                <RoundBtn label="R3" icon="R3" onInput={sendInput} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// === HELPER UI COMPONENTS (Tailwind) ===

function ShoulderBtn({ label, onInput }: { label: string; onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <button
            className="w-16 h-10 rounded-lg bg-black/40 border-2 border-white/10 text-white font-bold shadow-md active:bg-white/20 active:scale-95 transition-all"
            onPointerDown={() => onInput(label, 1)}
            onPointerUp={() => onInput(label, 0)}
            onPointerLeave={() => onInput(label, 0)}
        >
            {label}
        </button>
    );
}

function RoundBtn({ label, icon, onInput }: { label: string; icon: string; onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <button
            className="w-10 h-10 rounded-full bg-black/60 border border-white/20 text-white font-bold shadow-lg flex items-center justify-center hover:bg-black/80 active:scale-95"
            onPointerDown={() => onInput(label, 1)}
            onPointerUp={() => onInput(label, 0)}
            onPointerLeave={() => onInput(label, 0)}
        >
            {icon}
        </button>
    );
}

function DPadCluster({ onInput }: { onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <div className="grid grid-cols-3 gap-1 w-32 h-32 rotate-0">
            <div />
            <DPadBtn icon="▲" label="DPadUp" onInput={onInput} />
            <div />
            <DPadBtn icon="◀" label="DPadLeft" onInput={onInput} />
            <div className="bg-black/20 rounded" />
            <DPadBtn icon="▶" label="DPadRight" onInput={onInput} />
            <div />
            <DPadBtn icon="▼" label="DPadDown" onInput={onInput} />
            <div />
        </div>
    );
}

function DPadBtn({ icon, label, onInput }: { icon: string; label: string; onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <button
            className="w-full h-full bg-black/40 rounded flex items-center justify-center text-white active:bg-white/30 active:scale-90"
            onPointerDown={() => onInput(label, 1)}
            onPointerUp={() => onInput(label, 0)}
            onPointerLeave={() => onInput(label, 0)}
        >
            {icon}
        </button>
    );
}

function ABXYCluster({ onInput }: { onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <div className="grid grid-cols-3 gap-2 w-32 h-32">
            <div />
            <ABXYBtn label="X" color="text-yellow-400" onInput={onInput} />
            <div />
            <ABXYBtn label="Y" color="text-cyan-400" onInput={onInput} />
            <div />
            <ABXYBtn label="A" color="text-green-400" onInput={onInput} />
            <div />
            <ABXYBtn label="B" color="text-red-400" onInput={onInput} />
            <div />
        </div>
    );
}

function ABXYBtn({ label, color, onInput }: { label: string; color: string; onInput: (btn: string, state: 0 | 1) => void }) {
    return (
        <button
            className={clsx(
                "w-full h-full rounded-full bg-black/40 border-2 border-white/10 flex items-center justify-center text-xl font-black shadow-lg active:scale-90 active:bg-white/20 transition-all",
                color
            )}
            onPointerDown={() => onInput(label, 1)}
            onPointerUp={() => onInput(label, 0)}
            onPointerLeave={() => onInput(label, 0)}
        >
            {label}
        </button>
    );
}
