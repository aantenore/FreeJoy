import express from 'express';
import { createServer as createHttpsServer } from 'https';
import { createServer as createHttpServer } from 'http';
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
    const HTTPS_PORT: number = PORT + 1;  // HTTPS on 3001
    const HTTP_PORT: number = PORT;        // HTTP on 3000

    // Create HTTP redirect app
    const httpApp = express();
    httpApp.use((req, res) => {
        // Redirect all HTTP to HTTPS
        const host = req.headers.host?.split(':')[0] || 'localhost';
        res.redirect(301, `https://${host}:${HTTPS_PORT}${req.url}`);
    });

    // Start HTTP redirect server
    const httpRedirectServer = createHttpServer(httpApp);
    httpRedirectServer.listen(HTTP_PORT, () => {
        console.log(`🔀 HTTP Redirect: http://localhost:${HTTP_PORT} → https://localhost:${HTTPS_PORT}`);
    });

    // Load SSL certificate for HTTPS
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../cert.pem'))
    };

    const httpsServer = createHttpsServer(httpsOptions, app);
    const protocol = 'https';

    // 1. Setup IO
    const io = new Server(httpsServer, {
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
    app.use(express.static(CLIENT_PATH));

    app.get('/api/room', (req, res) => {
        res.json(roomManager.getState());
    });

    app.get('*', (req, res) => {
        if (req.accepts('html')) {
            if (fs.existsSync(path.join(CLIENT_PATH, 'index.html'))) {
                res.sendFile(path.join(CLIENT_PATH, 'index.html'));
            } else {
                res.status(404).send('Client not built. Run `npm run build` in client folder.');
            }
        } else {
            res.status(404).send('Not Found');
        }
    });

    // 4. Start HTTPS Server
    httpsServer.listen(HTTPS_PORT, () => {
        const roomState = roomManager.getState();
        const serverIp = roomState.serverIp;

        console.log('==========================================');
        console.log('🎮 Wireless Gamepad Server Started');
        console.log('🔌 Plugin:', plugin.name);
        console.log('🏠 Room ID:', roomManager.roomId);
        console.log('🔗 HTTPS: https://localhost:' + HTTPS_PORT);
        console.log('🔗 HTTP (redirects): http://localhost:' + HTTP_PORT);

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

        const joinUrl = `${protocol}://${serverIp}:${HTTPS_PORT}/pad`;
        console.log('📱 QR Code URL:', joinUrl);
        console.log('==========================================\n');

        qrcode.toString(joinUrl, { type: 'terminal', small: true }, (err, qr) => {
            if (!err) console.log(qr);
            console.log('\nIMPORTANT: Room ID is', roomManager.roomId);
        });
    });
}

bootstrap().catch(err => console.error(err));
