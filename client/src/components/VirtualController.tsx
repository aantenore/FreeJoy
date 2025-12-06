import { clsx } from 'clsx';
import { GamepadButton } from '../types';

interface VirtualControllerProps {
    onInput: (btn: string, state: 0 | 1) => void;
    playerId: number;
}

export function VirtualController({ onInput, playerId }: VirtualControllerProps) {
    const handleTouch = (btn: string, state: 0 | 1) => (e: React.SyntheticEvent) => {
        e.preventDefault();
        onInput(btn, state);
    };

    const colors = [
        'border-green-500', // P1
        'border-blue-500',  // P2
        'border-yellow-500',// P3
        'border-purple-500' // P4
    ];
    const playerColor = colors[playerId - 1] || 'border-gray-500';

    return (
        <div className={`w-full h-full flex flex-row justify-between items-center px-8 pb-4 relative border-8 rounded-3xl ${playerColor}`}>

            {/* LEFT SIDE: D-PAD + L/ZL */}
            <div className="flex flex-col gap-6 items-center">
                {/* Shoulders Left */}
                <div className="flex gap-4 mb-2">
                    <Btn label="ZL" type="trigger" onInput={onInput} />
                    <Btn label="L" type="trigger" onInput={onInput} />
                </div>

                {/* D-Pad */}
                <div className="grid grid-cols-3 grid-rows-3 gap-1 w-48 h-48">
                    <div />
                    <Btn label="Up" icon="▲" onInput={onInput} />
                    <div />
                    <Btn label="Left" icon="◀" onInput={onInput} />
                    <div className="bg-slate-800 rounded" />
                    <Btn label="Right" icon="▶" onInput={onInput} />
                    <div />
                    <Btn label="Down" icon="▼" onInput={onInput} />
                    <div />
                </div>
            </div>

            {/* CENTER: Start/Select */}
            <div className="flex flex-row gap-8 items-end pb-8">
                <Btn label="Select" icon="-" type="rect" onInput={onInput} />
                <Btn label="Start" icon="+" type="rect" onInput={onInput} />
            </div>

            {/* RIGHT SIDE: ABXY + R/ZR */}
            <div className="flex flex-col gap-6 items-center">
                {/* Shoulders Right */}
                <div className="flex gap-4 mb-2">
                    <Btn label="R" type="trigger" onInput={onInput} />
                    <Btn label="ZR" type="trigger" onInput={onInput} />
                </div>

                {/* ABXY */}
                <div className="grid grid-cols-3 grid-rows-3 gap-4 w-48 h-48 relative">
                    <div className="col-start-2 row-start-1 flex justify-center">
                        <Btn label="Y" color="bg-gray-400" onInput={onInput} />
                    </div>
                    <div className="col-start-1 row-start-2 flex justify-center">
                        <Btn label="X" color="bg-gray-400" onInput={onInput} />
                    </div>
                    <div className="col-start-3 row-start-2 flex justify-center">
                        <Btn label="B" color="joycon-red" onInput={onInput} />
                    </div>
                    <div className="col-start-2 row-start-3 flex justify-center">
                        <Btn label="A" color="joycon-blue" onInput={onInput} />
                    </div>
                </div>
            </div>

            {/* Player Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 px-4 py-1 rounded-full text-sm font-bold opacity-80">
                Player {playerId}
            </div>
        </div>
    );
}

function Btn({ label, icon, type = 'round', color = 'bg-slate-700', onInput }: any) {
    const baseStyle = "flex items-center justify-center font-bold text-xl active:scale-90 transition-transform shadow-lg active:opacity-80 select-none touch-none";
    let shapeStyle = "";

    if (type === 'round') shapeStyle = "w-16 h-16 rounded-full";
    if (type === 'rect') shapeStyle = "w-12 h-12 rounded-full"; // Small round for start/select
    if (type === 'trigger') shapeStyle = "w-24 h-12 rounded-full text-sm bg-slate-600";

    // Dynamic color handling
    let bgClass = color;
    if (color === 'joycon-blue') bgClass = 'bg-[#00C3E3] text-black';
    if (color === 'joycon-red') bgClass = 'bg-[#FF4554] text-white';

    return (
        <button
            className={clsx(baseStyle, shapeStyle, bgClass)}
            onPointerDown={(e) => { e.preventDefault(); onInput(label, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onInput(label, 0); }}
            onPointerLeave={(e) => { e.preventDefault(); onInput(label, 0); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {icon || label}
        </button>
    )
}
