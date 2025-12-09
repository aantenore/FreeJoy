import { useEffect, useRef, useState } from "react";
import { clsx } from 'clsx';
import { Joystick } from 'react-joystick-component';
import io, { Socket } from 'socket.io-client';

export function ProController({ roomId }: { roomId: string }) {
    const [status1, setStatus1] = useState('connecting');
    const [status2, setStatus2] = useState('connecting');
    const socket1 = useRef<Socket | null>(null);
    const socket2 = useRef<Socket | null>(null);

    // === SOCKET CONNECTION LOGIC for P1 and P2 ===
    useEffect(() => {
        const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

        // Connect Socket 1 (Left JoyCon / P1)
        const s1 = io(url, { reconnectionAttempts: 5 });
        s1.on('connect', () => {
            console.log("Pro Mode: Socket 1 Connected");
            s1.emit('join', { roomId, desiredSlot: 1, clientId: 'pro-left' });
        });
        s1.on('joined', () => setStatus1('connected'));
        s1.on('disconnect', () => setStatus1('disconnected'));
        socket1.current = s1;

        // Connect Socket 2 (Right JoyCon / P2)
        const s2 = io(url, { reconnectionAttempts: 5 });
        s2.on('connect', () => {
            console.log("Pro Mode: Socket 2 Connected");
            s2.emit('join', { roomId, desiredSlot: 2, clientId: 'pro-right' });
        });
        s2.on('joined', () => setStatus2('connected'));
        s2.on('disconnect', () => setStatus2('disconnected'));
        socket2.current = s2;

        return () => {
            s1.disconnect();
            s2.disconnect();
        };
    }, [roomId]);

    // === INPUT HANDLERS ===
    const sendInput = (socketIndex: 1 | 2, btn: string, state: 0 | 1) => {
        const sock = socketIndex === 1 ? socket1.current : socket2.current;
        if (sock && sock.connected) {
            sock.emit('input', { btn, state });
            if (state === 1 && navigator.vibrate) navigator.vibrate(10);
        }
    };

    const sendAnalog = (socketIndex: 1 | 2, stick: 'left' | 'right', x: number, y: number) => {
        const sock = socketIndex === 1 ? socket1.current : socket2.current;
        if (sock && sock.connected) {
            sock.emit('analog', { stick, x, y });
        }
    };

    // Prevent context menu
    useEffect(() => {
        const handler = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', handler);
        return () => document.removeEventListener('contextmenu', handler);
    }, []);

    return (
        <div className="w-screen h-dvh bg-slate-900 flex flex-row overflow-hidden select-none touch-none">
            {/* === LEFT SIDE (Player 1) === */}
            <div className="flex-1 bg-gradient-to-br from-[#00C3E3] to-[#0088A3] p-2 flex flex-col justify-between relative border-r-4 border-black/20">
                <div className={clsx(
                    "absolute top-2 left-2 w-3 h-3 rounded-full shadow-lg z-50",
                    status1 === 'connected' ? "bg-green-400" : "bg-red-400 animate-pulse"
                )} />

                <div className="flex justify-between items-start mb-1">
                    <div className="flex gap-2">
                        <ShoulderBtn label="ZL" onInput={(b, s) => sendInput(1, b, s)} />
                        <ShoulderBtn label="L" onInput={(b, s) => sendInput(1, b, s)} />
                    </div>
                    <RoundBtn label="Minus" icon="−" onInput={(b, s) => sendInput(1, b, s)} />
                </div>

                <div className="flex-1 flex flex-col items-center justify-evenly w-full">
                    <div className="relative p-2 bg-black/10 rounded-full border border-white/5">
                        <Joystick
                            size={80}
                            stickSize={50}
                            baseColor="rgba(0,0,0,0.3)"
                            stickColor="#222"
                            throttle={30}
                            move={(e) => sendAnalog(1, 'left', (e.x || 0) / 40, -(e.y || 0) / 40)}
                            stop={() => sendAnalog(1, 'left', 0, 0)}
                        />
                        <div className="absolute -top-4 -right-4 transform scale-75">
                            <RoundBtn label="L3" icon="L3" onInput={(b, s) => sendInput(1, b, s)} />
                        </div>
                    </div>

                    <div className="transform scale-90">
                        <DPadCluster onInput={(b, s) => sendInput(1, b, s)} />
                    </div>
                </div>
            </div>

            {/* === CENTER STRIP === */}
            <div className="w-8 bg-black flex flex-col items-center justify-center gap-4 border-x border-white/10 z-10 shadow-xl">
                <div className="text-white/20 font-bold vertical-text text-[10px] tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
                    PRO
                </div>
            </div>

            {/* === RIGHT SIDE (Player 2) === */}
            <div className="flex-1 bg-gradient-to-br from-[#FF4554] to-[#C41E3A] p-2 flex flex-col justify-between relative border-l-4 border-black/20">
                <div className={clsx(
                    "absolute top-2 right-2 w-2 h-2 rounded-full shadow-lg z-50",
                    status2 === 'connected' ? "bg-green-400" : "bg-red-400 animate-pulse"
                )} />

                <div className="flex justify-between items-start mb-1 flex-row-reverse">
                    <div className="flex gap-1">
                        <ShoulderBtn label="ZR" onInput={(b, s) => sendInput(2, b, s)} />
                        <ShoulderBtn label="R" onInput={(b, s) => sendInput(2, b, s)} />
                    </div>
                    <RoundBtn label="Plus" icon="+" onInput={(b, s) => sendInput(2, b, s)} />
                </div>

                <div className="flex-1 flex flex-col items-center justify-evenly w-full">
                    <div className="transform scale-90">
                        <ABXYCluster onInput={(b, s) => sendInput(2, b, s)} />
                    </div>

                    <div className="relative p-2 bg-black/10 rounded-full border border-white/5">
                        <Joystick
                            size={80}
                            stickSize={50}
                            baseColor="rgba(0,0,0,0.3)"
                            stickColor="#222"
                            throttle={30}
                            move={(e) => sendAnalog(2, 'right', (e.x || 0) / 40, -(e.y || 0) / 40)}
                            stop={() => sendAnalog(2, 'right', 0, 0)}
                        />
                        <div className="absolute -top-4 -left-4 transform scale-75">
                            <RoundBtn label="R3" icon="R3" onInput={(b, s) => sendInput(2, b, s)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// === HELPER COMPONENTS ===
function ShoulderBtn({ label, onInput }: any) {
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

function RoundBtn({ label, icon, onInput }: any) {
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

function DPadCluster({ onInput }: any) {
    return (
        <div className="grid grid-cols-3 gap-1 w-32 h-32">
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

function DPadBtn({ icon, label, onInput }: any) {
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

function ABXYCluster({ onInput }: any) {
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

function ABXYBtn({ label, color, onInput }: any) {
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
