export type ConnectionState = 'connecting' | 'connected' | 'error' | 'disconnected' | 'room_full' | 'room_closed';

export interface PlayerState {
    playerId: number;
    roomId: string;
    profile?: any;
}

export interface GamepadButton {
    id: string;
    label?: string;
    type: 'round' | 'rect' | 'trigger';
    color?: string;
    size?: string;
}
