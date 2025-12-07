import { clsx } from 'clsx';
import { Joystick } from 'react-joystick-component';

interface VirtualControllerProps {
    onInput: (btn: string, state: 0 | 1) => void;
    onAnalog: (stick: 'left' | 'right', x: number, y: number) => void;
    playerId: number;
    profile?: any;
    totalPlayers?: number;
}

export function VirtualController({ onInput, onAnalog, playerId, profile, totalPlayers = 4 }: VirtualControllerProps) {
    // Determine Joy-Con type
    let isLeftJoyCon = playerId === 1 || playerId === 3;
    if (profile?.type) {
        isLeftJoyCon = profile.type === 'left_joycon';
    }

    const bgColor = isLeftJoyCon
        ? 'bg-gradient-to-br from-[#00C3E3] to-[#0088A3]'
        : 'bg-gradient-to-br from-[#FF4554] to-[#C41E3A]';

    const neonColor = isLeftJoyCon ? '#00C3E3' : '#FF4554';

    return (
        <div className={clsx(
            "w-screen h-dvh flex flex-col select-none touch-none overflow-hidden",
            "safe-area-inset",
            bgColor
        )}>
            {/* === TOP ROW: Shoulder Buttons (Always at top in landscape) === */}
            <div className="flex justify-between items-center px-4 py-3 shrink-0">
                <div className="flex gap-3">
                    <ShoulderBtn label={isLeftJoyCon ? "ZL" : "ZR"} onInput={onInput} />
                    <ShoulderBtn label={isLeftJoyCon ? "L" : "R"} onInput={onInput} />
                </div>
                <div className="flex gap-3">
                    <SystemBtn label={isLeftJoyCon ? "Minus" : "Plus"} icon={isLeftJoyCon ? "−" : "+"} onInput={onInput} />
                </div>
            </div>

            {/* === MAIN AREA: Stick + LED + Buttons === */}
            <div className="flex-1 flex flex-row items-center justify-evenly px-4 pb-2">

                {/* LEFT ZONE: Analog Stick */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-36 h-36">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-900 to-black shadow-2xl border-4 border-black/40" />
                        <div
                            className="absolute w-3 h-3 rounded-full z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ backgroundColor: neonColor, boxShadow: `0 0 12px ${neonColor}` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center" style={{ touchAction: 'none' }}>
                            <Joystick
                                size={110}
                                stickSize={65}
                                baseColor="rgba(0,0,0,0)"
                                stickColor="#1a1a1a"
                                throttle={50}
                                move={(e) => onAnalog(isLeftJoyCon ? 'left' : 'right', (e.x ?? 0) / 55, -(e.y ?? 0) / 55)}
                                stop={() => onAnalog(isLeftJoyCon ? 'left' : 'right', 0, 0)}
                            />
                        </div>
                    </div>
                    <SmallBtn label={isLeftJoyCon ? "L3" : "R3"} onInput={onInput} />
                </div>

                {/* CENTER ZONE: LED Indicator */}
                <div className="flex flex-col items-center justify-center gap-2">
                    {Array.from({ length: totalPlayers }).map((_, i) => (
                        <div
                            key={i}
                            className={clsx(
                                "w-3 h-3 rounded-full transition-all",
                                (i + 1) === playerId
                                    ? 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]'
                                    : 'bg-black/40'
                            )}
                        />
                    ))}
                </div>

                {/* RIGHT ZONE: D-Pad or ABXY */}
                {isLeftJoyCon ? (
                    <DPadCluster onInput={onInput} />
                ) : (
                    <ABXYCluster onInput={onInput} />
                )}
            </div>

            {/* === BOTTOM ROW: SL/SR (Safe area padding) === */}
            <div className="flex justify-end items-center gap-3 px-4 py-3 shrink-0 pb-safe">
                <RailBtn label="SL" onInput={onInput} />
                <RailBtn label="SR" onInput={onInput} />
            </div>
        </div>
    );
}

// === SUB-COMPONENTS ===

function ShoulderBtn({ label, onInput }: any) {
    return (
        <button
            className="px-6 py-2 rounded-lg bg-[#222] text-gray-300 text-sm font-bold shadow-lg active:scale-95 active:bg-black transition-all"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {label}
        </button>
    );
}

function SystemBtn({ label, icon, onInput }: any) {
    return (
        <button
            className="w-10 h-10 rounded-full bg-[#222] text-gray-300 text-xl font-bold shadow-lg active:scale-90 active:bg-black transition-all flex items-center justify-center"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {icon}
        </button>
    );
}

function SmallBtn({ label, onInput }: any) {
    return (
        <button
            className="px-4 py-2 rounded-lg bg-[#222] text-gray-400 text-xs font-bold shadow-md active:scale-90 transition-all"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {label}
        </button>
    );
}

function RailBtn({ label, onInput }: any) {
    return (
        <button
            className="px-5 py-2 rounded-lg bg-[#222] text-gray-400 text-xs font-bold shadow-md active:scale-95 transition-all"
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {label}
        </button>
    );
}

function DPadCluster({ onInput }: any) {
    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-40 h-40">
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
                className="w-12 h-12 rounded-full bg-[#222] text-gray-200 text-xl font-bold shadow-lg active:scale-90 active:bg-black transition-all flex items-center justify-center"
                onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
                onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
                onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {icon}
            </button>
        </div>
    );
}

function ABXYCluster({ onInput }: any) {
    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-40 h-40">
            <div />
            <ABXYBtn label="X" color="text-yellow-400" onInput={onInput} />
            <div />
            <ABXYBtn label="Y" color="text-cyan-400" onInput={onInput} />
            <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-black/20" />
            </div>
            <ABXYBtn label="A" color="text-green-400" onInput={onInput} />
            <div />
            <ABXYBtn label="B" color="text-red-400" onInput={onInput} />
            <div />
        </div>
    );
}

function ABXYBtn({ label, color, onInput }: any) {
    return (
        <div className="flex items-center justify-center">
            <button
                className={clsx(
                    "w-12 h-12 rounded-full bg-[#222] text-xl font-black shadow-lg active:scale-90 active:bg-black transition-all flex items-center justify-center",
                    color
                )}
                onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
                onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
                onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {label}
            </button>
        </div>
    );
}
