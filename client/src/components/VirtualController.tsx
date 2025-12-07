import { Joystick } from 'react-joystick-component';

interface VirtualControllerProps {
    onInput: (btn: string, state: 0 | 1) => void;
    onAnalog: (stick: 'left' | 'right', x: number, y: number) => void;
    playerId: number;
    profile?: any;
    totalPlayers?: number;
}

export function VirtualController({ onInput, onAnalog, playerId, profile, totalPlayers = 4 }: VirtualControllerProps) {
    let isLeftJoyCon = playerId === 1 || playerId === 3;

    if (profile && profile.type) {
        isLeftJoyCon = profile.type === 'left_joycon';
    }

    const joyconColor = isLeftJoyCon
        ? 'from-[#00D4FF] to-[#0099CC]'
        : 'from-[#FF4D6D] to-[#C9184A]';

    const neonColor = isLeftJoyCon ? '#00D4FF' : '#FF4D6D';

    return (
        <div className="w-full h-dvh flex items-center justify-center bg-gradient-to-br from-slate-950 to-black overflow-hidden">
            {/* Joy-Con Container - Fixed Portrait Layout */}
            <div className={`
                relative flex flex-col
                bg-gradient-to-br ${joyconColor}
                rounded-[2.5rem]
                shadow-2xl border-4 border-black/30
                select-none touch-none
                w-[min(90vw,340px)] h-[min(90dvh,700px)]
            `}>

                {/* === PLAYER LED INDICATOR (Small dots, no numbers) === */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex gap-1.5">
                    {Array.from({ length: totalPlayers }).map((_, i) => (
                        <div
                            key={i}
                            className={`
                                w-2.5 h-2.5 rounded-full transition-all
                                ${(i + 1) === playerId
                                    ? 'bg-[#39FF14] shadow-[0_0_6px_#39FF14]'
                                    : 'bg-gray-600/60'}
                            `}
                        />
                    ))}
                </div>

                {/* TOP: Shoulders */}
                <div className="flex flex-col gap-2 px-6 pt-10 pb-3">
                    {isLeftJoyCon ? (
                        <>
                            <ShoulderBtn label="ZL" onInput={onInput} />
                            <ShoulderBtn label="L" onInput={onInput} />
                        </>
                    ) : (
                        <>
                            <ShoulderBtn label="ZR" onInput={onInput} />
                            <ShoulderBtn label="R" onInput={onInput} />
                        </>
                    )}
                </div>

                {/* MAIN BODY */}
                <div className="flex-1 flex flex-col items-center justify-evenly px-6 py-2">
                    {isLeftJoyCon ? (
                        <>
                            {/* System + Stick */}
                            <div className="w-full flex flex-col items-center gap-4">
                                <div className="w-full flex justify-start">
                                    <SystemBtn icon="−" label="Minus" onInput={onInput} />
                                </div>
                                <div className="flex items-center gap-4">
                                    <AnalogStick
                                        neonColor={neonColor}
                                        onAnalog={(x, y) => onAnalog('left', x, -y)}
                                        onStop={() => onAnalog('left', 0, 0)}
                                    />
                                    <StickBtn label="L3" onInput={onInput} />
                                </div>
                            </div>
                            {/* D-Pad */}
                            <DPadCluster onInput={onInput} />
                        </>
                    ) : (
                        <>
                            {/* System + ABXY */}
                            <div className="w-full flex flex-col items-center gap-4">
                                <div className="w-full flex justify-end">
                                    <SystemBtn icon="+" label="Plus" onInput={onInput} />
                                </div>
                                <ABXYCluster onInput={onInput} />
                            </div>
                            {/* Stick */}
                            <div className="flex items-center gap-4">
                                <AnalogStick
                                    neonColor={neonColor}
                                    onAnalog={(x, y) => onAnalog('right', x, -y)}
                                    onStop={() => onAnalog('right', 0, 0)}
                                />
                                <StickBtn label="R3" onInput={onInput} />
                            </div>
                        </>
                    )}
                </div>

                {/* BOTTOM: SL/SR */}
                <div className="flex justify-center gap-4 px-6 pb-5">
                    <RailBtn label="SL" onInput={onInput} />
                    <RailBtn label="SR" onInput={onInput} />
                </div>
            </div>
        </div>
    );
}

// === SUB-COMPONENTS ===

function AnalogStick({ neonColor, onAnalog, onStop }: any) {
    return (
        <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-xl border-4 border-black/40" />
            <div
                className="absolute w-2 h-2 rounded-full z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ backgroundColor: neonColor, boxShadow: `0 0 8px ${neonColor}` }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ touchAction: 'none' }}>
                <Joystick
                    size={85}
                    stickSize={50}
                    baseColor="rgba(0,0,0,0)"
                    stickColor="#1a1a1a"
                    throttle={50}
                    move={(e) => onAnalog((e.x ?? 0) / 42, (e.y ?? 0) / 42)}
                    stop={onStop}
                />
            </div>
        </div>
    );
}

function ShoulderBtn({ label, onInput }: any) {
    return (
        <button
            className="w-full h-10 rounded-2xl bg-gradient-to-b from-gray-700 to-gray-900 text-gray-100 text-sm font-bold shadow-lg border-2 border-gray-800 active:scale-95 transition-all"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
        >
            {label}
        </button>
    );
}

function DPadCluster({ onInput }: any) {
    return (
        <div className="grid grid-cols-3 w-36 h-36 gap-1">
            <div />
            <DPadBtn icon="▲" label="DPadUp" onInput={onInput} />
            <div />
            <DPadBtn icon="◀" label="DPadLeft" onInput={onInput} />
            <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-black/20" />
            </div>
            <DPadBtn icon="▶" label="DPadRight" onInput={onInput} />
            <div />
            <DPadBtn icon="▼" label="DPadDown" onInput={onInput} />
            <div />
        </div>
    );
}

function DPadBtn({ icon, label, onInput }: any) {
    return (
        <div className="flex items-center justify-center">
            <button
                className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-gray-200 text-xl font-bold shadow-lg border-2 border-gray-600 active:scale-90 transition-all flex items-center justify-center"
                onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
                onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
                onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            >
                {icon}
            </button>
        </div>
    );
}

function ABXYCluster({ onInput }: any) {
    return (
        <div className="grid grid-cols-3 w-36 h-36 gap-1">
            <div />
            <ABXYBtn label="X" color="from-yellow-400 to-yellow-600" text="text-gray-900" onInput={onInput} />
            <div />
            <ABXYBtn label="Y" color="from-cyan-400 to-cyan-600" text="text-white" onInput={onInput} />
            <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-black/20" />
            </div>
            <ABXYBtn label="A" color="from-green-400 to-green-600" text="text-white" onInput={onInput} />
            <div />
            <ABXYBtn label="B" color="from-red-400 to-red-600" text="text-white" onInput={onInput} />
            <div />
        </div>
    );
}

function ABXYBtn({ label, color, text, onInput }: any) {
    return (
        <div className="flex items-center justify-center">
            <button
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} ${text} text-xl font-black shadow-lg border-2 border-white/20 active:scale-90 transition-all flex items-center justify-center`}
                onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
                onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
                onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            >
                {label}
            </button>
        </div>
    );
}

function SystemBtn({ icon, label, onInput }: any) {
    return (
        <button
            className="w-10 h-10 rounded-full bg-gray-800 text-white text-xl font-bold shadow-md border-2 border-gray-600 active:scale-90 transition-all flex items-center justify-center"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
        >
            {icon}
        </button>
    );
}

function StickBtn({ label, onInput }: any) {
    return (
        <button
            className="w-10 h-10 rounded-full bg-gray-800 text-gray-300 text-xs font-bold border-2 border-gray-600 active:scale-90 active:bg-gray-700 transition-all flex items-center justify-center"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
        >
            {label}
        </button>
    );
}

function RailBtn({ label, onInput }: any) {
    return (
        <button
            className="w-16 h-9 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold shadow-md border border-gray-600 active:scale-95 transition-all flex items-center justify-center"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
        >
            {label}
        </button>
    );
}
