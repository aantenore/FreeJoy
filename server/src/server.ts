import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import qrcode from 'qrcode';
import cors from 'cors';
import path from 'path';
import { networkInterfaces } from 'os';
import fs from 'fs';
import { RoomManager } from './roomManager';
import { WSHandler } from './wsHandler';
import { RyujinxPlugin } from './plugins/RyujinxPlugin';

async function bootstrap() {
    const app = express();
    const httpServer = createServer(app);
    const PORT: number = parseInt(process.env.PORT || '3000', 10);

    // 1. Setup IO
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // 2. Setup Core Logic
    const roomManager = new RoomManager();
    const plugin = new RyujinxPlugin();
    await plugin.init();

    const wsHandler = new WSHandler(io, roomManager, plugin);
    wsHandler.init();

    // 3. Setup Express Routes
    app.use(cors());
    app.use(express.json());

    // Serve the React Client (Production Build)
    const CLIENT_PATH = path.join(__dirname, '../../client/dist_build');
    app.use(express.static(CLIENT_PATH));

    // API to get room info
    app.get('/api/room', (req, res) => {
        res.json(roomManager.getState());
    });

    // Fallback for SPA routing
    app.get('*', (req, res) => {
        if (req.accepts('html')) {
            if (fs.existsSync(path.join(CLIENT_PATH, 'index.html'))) {
                res.sendFile(path.join(CLIENT_PATH, 'index.html'));
            } else {
                res.status(404).send('Client not built. Please run `npm run build` in client folder.');
            }
        } else {
            res.status(404).send('Not Found');
        }
    });

    // 4. Start Server
    httpServer.listen(PORT, '0.0.0.0', () => {
        // Get server IP from RoomManager (Wi-Fi prioritized) - called only once
        const roomState = roomManager.getState();
        const serverIp = roomState.serverIp;

        console.log('\n==========================================');
        console.log('🎮 Switch Gamepad Server Started');
        console.log('🔌 Plugin:', plugin.name);
        console.log('🏠 Room ID:', roomManager.roomId);
        console.log('🔗 Local: http://localhost:' + PORT);

        // Display all network interfaces for debugging
        console.log('📱 Available Network Addresses:');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            const iface = nets[name];
            if (iface) {
                for (const net of iface) {
                    if (net.family === 'IPv4' && !net.internal) {
                        console.log(`   - ${name}: ${net.address}`);
                    }
                }
            }
        }

        // Generate QR code URL using Wi-Fi IP
        const joinUrl = `http://${serverIp}:${PORT}/join?room=${roomManager.roomId}`;
        console.log('📱 QR Code URL (Primary):', joinUrl);
        console.log('==========================================\n');

        // Generate and display QR code
        qrcode.toString(joinUrl, { type: 'terminal', small: true }, (err, qr) => {
            if (!err) console.log(qr);
            console.log('\nIMPORTANT: Room ID is', roomManager.roomId);
        });
    });
}

bootstrap().catch(err => console.error(err));
