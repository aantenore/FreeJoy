import express from 'express';
import { rateLimit } from 'express-rate-limit';
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
    const PORT: number = parseInt(process.env.PORT || '3000', 10);

    // Create Standard HTTP Server
    const httpServer = createServer(app);
    const protocol = 'http';

    // 1. Setup IO
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // 2. Setup Core Logic
    const plugin = new RyujinxPlugin();
    await plugin.init();

    const roomManager = new RoomManager(plugin.maxPlayers);
    const wsHandler = new WSHandler(io, roomManager, plugin);
    wsHandler.init();

    // 3. Setup Express Routes
    app.use(cors());
    app.use(express.json());

    const CLIENT_PATH = path.join(__dirname, '../../client/dist_build');
    const CLIENT_INDEX_PATH = path.join(CLIENT_PATH, 'index.html');
    const clientIndexAvailable = fs.existsSync(CLIENT_INDEX_PATH);
    const clientFallbackLimiter = rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: 'draft-8',
        legacyHeaders: false
    });
    app.use(express.static(CLIENT_PATH));

    app.get('/api/room', (req, res) => {
        res.json(roomManager.getState());
    });

    app.get('/{*splat}', clientFallbackLimiter, (req, res) => {
        if (req.accepts('html')) {
            if (clientIndexAvailable) {
                res.sendFile(CLIENT_INDEX_PATH);
            } else {
                res.status(404).send('Client not built. Run `npm run build` in client folder.');
            }
        } else {
            res.status(404).send('Not Found');
        }
    });

    // 4. Start HTTP Server
    httpServer.listen(PORT, () => {
        const roomState = roomManager.getState();
        const serverIp = roomState.serverIp; // Already cached/detected

        console.log('==========================================');
        console.log('🎮 Wireless Gamepad Server Started (HTTP)');
        console.log('🔌 Plugin:', plugin.name);
        console.log('🏠 Room ID:', roomManager.roomId);
        console.log('🔗 URL:', `${protocol}://${serverIp}:${PORT}`);

        console.log('📱 Network Addresses:');
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

        const joinUrl = `${protocol}://${serverIp}:${PORT}/pad`;
        console.log('📱 QR Code URL:', joinUrl);
        console.log('==========================================\n');

        qrcode.toString(joinUrl, { type: 'terminal', small: true }, (err, qr) => {
            if (!err) console.log(qr);
            console.log('\nIMPORTANT: Room ID is', roomManager.roomId);
        });
    });
}

bootstrap().catch(err => console.error(err));
