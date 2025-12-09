const robot = require('@hurdlegroup/robotjs');

// Simple worker to handle button presses
process.on('message', (msg) => {
    // Expected msg: { key: string, state: 'down' | 'up' }
    if (msg.key) {
        try {
            robot.keyToggle(msg.key, msg.state);
        } catch (err) {
            // Ignore errors (invalid key, etc) to keep worker alive
        }
    }
});
