import React from 'react';
import { VirtualController } from './VirtualController';
import './Controller.css';

export function Controller({ playerId, playerProfile, onInput, onAnalog }) {
    // VirtualController now handles rotation and logic internally
    // We just pass the profile down.

    return (
        <VirtualController
            playerId={playerId}
            profile={playerProfile}
            onInput={onInput}
            onAnalog={onAnalog}
        />
    );
}
