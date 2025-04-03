import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let senderSocket: null | WebSocket = null;
let receiverSocket: null | WebSocket = null;

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', function message(data: any) {
        const message = JSON.parse(data);
        if (message.type === "identify-as-sender") {
            console.log('identify-as-sender');
            senderSocket = ws;
        } else if (message.type === "identify-as-receiver") {
            console.log('identify-as-receiver');
            receiverSocket = ws;
        } else if (message.type === "create-offer") {
            console.log('create-offer');
            receiverSocket?.send(JSON.stringify({ type: "offer", sdp: message.sdp }));
        } else if (message.type === "create-answer") {
            console.log('create-answer');
            senderSocket?.send(JSON.stringify({ type: "answer", sdp: message.sdp }));
        }
    });

    ws.send('something');
});
