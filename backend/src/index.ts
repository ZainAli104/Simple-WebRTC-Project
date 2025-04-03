import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let senderSocket: null | WebSocket = null;
let receiverSocket: null | WebSocket = null;

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', function message(data: any) {
        const message = JSON.parse(data);
        console.log('Received message type:', message.type);
        
        if (message.type === "identify-as-sender") {
            console.log('Sender identified');
            senderSocket = ws;
        } else if (message.type === "identify-as-receiver") {
            console.log('Receiver identified');
            receiverSocket = ws;
        } else if (message.type === "create-offer") {
            console.log('Forwarding offer to receiver');
            receiverSocket?.send(JSON.stringify({ 
                type: "offer", 
                sdp: message.sdp 
            }));
        } else if (message.type === "create-answer") {
            console.log('Forwarding answer to sender');
            senderSocket?.send(JSON.stringify({ 
                type: "answer", 
                sdp: message.sdp 
            }));
        } else if (message.type === "iceCandidate") {
            console.log('Forwarding ICE candidate');
            // If received from sender, send to receiver
            if (ws === senderSocket) {
                console.log('Forwarding ICE candidate to receiver');
                receiverSocket?.send(JSON.stringify({
                    type: "iceCandidate",
                    candidate: message.candidate
                }));
            }
            // If received from receiver, send to sender
            else if (ws === receiverSocket) {
                console.log('Forwarding ICE candidate to sender');
                senderSocket?.send(JSON.stringify({
                    type: "iceCandidate",
                    candidate: message.candidate
                }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === senderSocket) {
            console.log('Sender disconnected');
            senderSocket = null;
        } else if (ws === receiverSocket) {
            console.log('Receiver disconnected');
            receiverSocket = null;
        }
    });
});

console.log('WebSocket server is running on port 8080');
