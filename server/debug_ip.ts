
import { RoomManager } from './src/roomManager';

const mgr = new RoomManager(4);
console.log("Room ID:", mgr.roomId);
console.log("State:", mgr.getState());
console.log("Server IP in State:", mgr.getState().serverIp);
