export interface IPlugin {
    name: string;
    version: string;
    maxPlayers: number;

    /** Initialize the plugin (e.g. connect to emulator) */
    init(): Promise<void>;

    /** Clean up resources on shutdown */
    cleanup(): Promise<void>;

    /** Send a digital button press (A, B, X, Y, etc.) */
    sendButtonPress(playerIndex: number, button: string, pressed: boolean): void;

    /** Send analog stick input (Left/Right stick) */
    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number): void;

    /** Get player profile configuration */
    getProfile?(playerIndex: number): any;
}
