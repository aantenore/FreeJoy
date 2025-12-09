const robot = require('@hurdlegroup/robotjs');

const activeKeys = new Set();

function updateKeys(newKeys) {
    for (const key of activeKeys) {
        if (!newKeys.includes(key)) {
            try { robot.keyToggle(key, 'up'); } catch (e) { }
        }
    }
    for (const key of newKeys) {
        if (!activeKeys.has(key)) {
            try { robot.keyToggle(key, 'down'); } catch (e) { }
        }
    }
    activeKeys.clear();
    for (const key of newKeys) activeKeys.add(key);
}

function axisToKeys(axes, axisMapping, threshold = 0.5) {
    const keys = [];
    if (axes.x !== undefined) {
        if (axes.x < -threshold) keys.push(axisMapping.x.negKey);
        else if (axes.x > threshold) keys.push(axisMapping.x.posKey);
    }
    if (axes.y !== undefined) {
        if (axes.y < -threshold) keys.push(axisMapping.y.negKey);
        else if (axes.y > threshold) keys.push(axisMapping.y.posKey);
    }
    return keys.filter(Boolean);
}

process.on('message', (msg) => {
    if (!msg) return;
    const buttons = Array.isArray(msg.buttons) ? msg.buttons : [];
    const axes = msg.axes || {};
    const axisMapping = msg.axisMapping || {};
    const axisKeys = axisToKeys(axes, axisMapping);
    updateKeys([...buttons, ...axisKeys]);
});
