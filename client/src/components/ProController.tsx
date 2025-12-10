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

            // Get device name from user agent
            const getDeviceName = () => {
                const ua = navigator.userAgent;
                if (/iPhone/.test(ua)) return 'iPhone';
                if (/iPad/.test(ua)) return 'iPad';
                if (/Android/.test(ua)) {
                    const match = ua.match(/Android.*; ([^)]+)\)/);
                    return match ? match[1] : 'Android Device';
                }
                if (/Windows/.test(ua)) return 'Windows PC';
                if (/Mac/.test(ua)) return 'Mac';
                return 'Unknown Device';
            };

            // Check if user has a saved nickname, otherwise prompt
            let deviceName = localStorage.getItem('deviceNickname');
            if (!deviceName) {
                const autoDetected = getDeviceName();
                deviceName = prompt(`Enter a name for this device (e.g. "${autoDetected} di Antonio"):`, autoDetected) || autoDetected;
                localStorage.setItem('deviceNickname', deviceName);
            }

            console.log(`[Client] Device name: "${deviceName}"`);

            s.emit('join', { roomId, clientId, deviceName });
        });

        s.on('joined', (data: { playerId: number }) => {
            console.log("Pro Controller: Joined as Player", data.playerId);
            setPlayerId(data.playerId);
            setStatus('connected');
        });

        s.on('kicked', (data: { reason: string }) => {
            // Clear stored IDs so player doesn't auto-rejoin
            localStorage.removeItem('clientId');
            localStorage.removeItem('deviceNickname');
            alert(`You were kicked: ${data.reason}`);
            window.location.href = '/'; // Redirect to home instead of reload
        });

        s.on('disconnect', () => setStatus('disconnected'));
        s.on('error', (err: any) => {
            console.error("Connection error:", err);
            if (err.code === 'ROOM_FULL') {
                alert('Room is full! Maximum 4 players.');
                window.location.href = '/';
            } else {
                setStatus('error');
            }
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
            <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <div className="flex gap-6 mb-8">
                        <div className="w-16 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-2xl transform -rotate-12 animate-bounce"></div>
                        <div className="w-16 h-32 bg-gradient-to-br from-red-400 to-pink-600 rounded-2xl shadow-2xl transform rotate-12 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#FF4D6D]">FREEJOY</p>
                    <p className="text-lg font-medium text-slate-300 mt-2">Connecting to Room...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="text-6xl mb-6">⚠️</div>
                    <p className="text-2xl font-bold text-red-400 mb-4">Connection Error</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 rounded-lg font-bold">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden select-none touch-none">
            {/* === CONTROLLER LAYOUT === */}
            <div className="flex-1 flex flex-row">
                {/* === LEFT SIDE === */}
                <div className="flex-1 bg-gradient-to-br from-[#00C3E3] to-[#0088A3] p-2 flex flex-col justify-between relative">
                    {/* Top Row: L / ZL / Minus */}
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex gap-2">
                            <ShoulderBtn label="L" onInput={sendInput} />
                            <ShoulderBtn label="ZL" onInput={sendInput} />
                        </div>
                        <RoundBtn label="Minus" icon="−" onInput={sendInput} />
                    </div>

                    {/* Main: Stick (Top) + DPad (Bottom) */}
                    <div className="flex-1 flex flex-col items-center justify-evenly w-full">
                        {/* Left Stick */}
                        <div className="relative p-3">
                            <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-full p-2 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1),0_0_12px_rgba(0,195,227,0.3)] border-4 border-black/40">
                                {/* Neon center dot */}
                                <div className="absolute w-3 h-3 rounded-full z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-[#00C3E3]" style={{ boxShadow: '0 0 12px #00C3E3' }} />
                                <Joystick
                                    size={80}
                                    stickSize={50}
                                    baseColor="rgba(0,0,0,0)"
                                    stickColor="#1a1a1a"
                                    throttle={30}
                                    move={(e: any) => sendAnalog('left', e.x || 0, -(e.y || 0))}
                                    stop={() => sendAnalog('left', 0, 0)}
                                />
                            </div>
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

                {/* === CENTER STRIP REMOVED === */}

                {/* === CENTER DIVIDER WITH LEDS === */}
                <div className="w-8 bg-black/40 backdrop-blur-md border-l border-r border-white/10 flex flex-col items-center justify-center gap-2">
                    {/* Vertical LED Strip */}
                    <div className="flex flex-col gap-3 p-2 rounded-full bg-black/20 border border-white/5">
                        {[1, 2, 3, 4].map(num => (
                            <div
                                key={num}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${playerId === num
                                    ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88] scale-125'
                                    : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* === RIGHT SIDE === */}
                <div className="flex-1 bg-gradient-to-bl from-[#FF4D6D] to-[#D93F5C] p-2 flex flex-col justify-between relative">
                    {/* Top Row: R / ZR / Plus */}
                    <div className="flex justify-between items-start mb-1 flex-row-reverse">
                        <div className="flex gap-1">
                            <ShoulderBtn label="ZR" onInput={sendInput} />
                            <ShoulderBtn label="R" onInput={sendInput} />
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
                        <div className="relative p-3">
                            <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-full p-2 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1),0_0_12px_rgba(255,69,84,0.3)] border-4 border-black/40">
                                {/* Neon center dot */}
                                <div className="absolute w-3 h-3 rounded-full z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-[#FF4554]" style={{ boxShadow: '0 0 12px #FF4554' }} />
                                <Joystick
                                    size={80}
                                    stickSize={50}
                                    baseColor="rgba(0,0,0,0)"
                                    stickColor="#1a1a1a"
                                    throttle={30}
                                    move={(e: any) => sendAnalog('right', e.x || 0, -(e.y || 0))}
                                    stop={() => sendAnalog('right', 0, 0)}
                                />
                            </div>
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
            className="w-16 h-10 rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 text-gray-200 font-bold shadow-[0_0_8px_rgba(160,160,160,0.3),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] active:shadow-[0_0_16px_rgba(180,180,180,0.5),inset_0_3px_8px_rgba(0,0,0,0.6)] active:translate-y-[2px] active:scale-95 transition-all duration-150"
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
            className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 border-2 border-gray-400/60 text-white font-bold shadow-[0_0_16px_rgba(200,200,200,0.6),0_0_28px_rgba(200,200,200,0.3),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_6px_rgba(0,0,0,0.4)] flex items-center justify-center active:shadow-[0_0_24px_rgba(255,255,255,0.9),0_0_40px_rgba(255,255,255,0.5),inset_0_3px_8px_rgba(0,0,0,0.6)] active:translate-y-[2px] active:scale-95 transition-all duration-150"
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
        <div className="grid grid-cols-3 gap-1 w-32 h-32 p-2 bg-gradient-to-br from-black/40 via-black/30 to-black/25 rounded-2xl shadow-[inset_0_0_12px_rgba(0,0,0,0.5),inset_0_-4px_8px_rgba(0,0,0,0.4),0_0_8px_rgba(255,255,255,0.1)] border border-white/10">
            <div />
            <DPadBtn icon="▲" label="DPadUp" onInput={onInput} />
            <div />
            <DPadBtn icon="◀" label="DPadLeft" onInput={onInput} />
            <div className="bg-gradient-radial from-black/60 to-black/40 rounded-full shadow-[inset_0_0_8px_rgba(0,0,0,0.6)]" />
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
            className="w-full h-full bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded shadow-[0_0_10px_rgba(180,180,180,0.4),0_0_20px_rgba(180,180,180,0.2),0_3px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center text-white text-lg font-bold active:shadow-[0_0_18px_rgba(220,220,220,0.8),0_0_30px_rgba(220,220,220,0.4),inset_0_3px_6px_rgba(0,0,0,0.6)] active:bg-gradient-to-br active:from-gray-700 active:to-gray-900 active:scale-95 transition-all duration-150"
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
            <ABXYBtn label="X" color="text-yellow-300" onInput={onInput} />
            <div />
            <ABXYBtn label="Y" color="text-cyan-300" onInput={onInput} />
            <div />
            <ABXYBtn label="A" color="text-green-300" onInput={onInput} />
            <div />
            <ABXYBtn label="B" color="text-red-300" onInput={onInput} />
            <div />
        </div>
    );
}

function ABXYBtn({ label, color, onInput }: { label: string; color: string; onInput: (btn: string, state: 0 | 1) => void }) {
    const glowColor = label === 'A' ? 'rgba(34,197,94,0.6)' :
        label === 'B' ? 'rgba(239,68,68,0.6)' :
            label === 'X' ? 'rgba(234,179,8,0.6)' :
                'rgba(6,182,212,0.6)';

    const activeGlow = label === 'A' ? 'rgba(34,197,94,0.9)' :
        label === 'B' ? 'rgba(239,68,68,0.9)' :
            label === 'X' ? 'rgba(234,179,8,0.9)' :
                'rgba(6,182,212,0.9)';

    return (
        <button
            className={clsx(
                "w-full h-full rounded-full bg-gradient-to-b from-gray-800 to-gray-900 border-3 border-white/30 flex items-center justify-center text-2xl font-black transition-all",
                color
            )}
            style={{
                boxShadow: `0 0 12px ${glowColor}, 0 4px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)`
            }}
            onPointerDown={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = `0 0 24px ${activeGlow}, inset 0 2px 6px rgba(0,0,0,0.5)`;
                (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                onInput(label, 1);
            }}
            onPointerUp={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = `0 0 12px ${glowColor}, 0 4px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)`;
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                onInput(label, 0);
            }}
            onPointerLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = `0 0 12px ${glowColor}, 0 4px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)`;
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                onInput(label, 0);
            }}
        >
            {label}
        </button>
    );
}
