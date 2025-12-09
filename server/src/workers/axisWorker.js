const robot = require('@hurdlegroup/robotjs');

/*
 Axis Worker
 Handles ONE axis (X or Y) for ONE stick.
 Maintains state to avoid key flutter.
*/

let activeKey = null; // Currently held key (e.g. 'w' or 's')

process.on('message', (msg) => {
    // Expected msg: { val: number, negKey: string, posKey: string }
    // val is -1 to 1

    const threshold = 0.5;
    let targetKey = null;

    if (msg.val < -threshold) targetKey = msg.negKey;
    else if (msg.val > threshold) targetKey = msg.posKey;

    // State Transition
    if (targetKey !== activeKey) {
        // Release old key if strictly different
        if (activeKey) {
            try { robot.keyToggle(activeKey, 'up'); } catch (e) { }
        }

        // Press new key
        if (targetKey) {
            try { robot.keyToggle(targetKey, 'down'); } catch (e) { }
        }

        activeKey = targetKey;
    }
});
