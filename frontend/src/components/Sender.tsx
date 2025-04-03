import {useEffect, useState} from "react"

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>("Not Connected");

    useEffect(() => {
        console.log("Sender component mounted");
        const socket = new WebSocket('ws://localhost:8080');
        setSocket(socket);
        
        socket.onopen = () => {
            console.log("WebSocket connected");
            socket.send(JSON.stringify({
                type: 'identify-as-sender'
            }));
        }

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        }

        return () => {
            socket.close();
        }
    }, []);

    const initiateConn = async () => {
        try {
            if (!socket) {
                alert("Socket not found");
                return;
            }

            // Configure WebRTC with STUN servers
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };

            const pc = new RTCPeerConnection(configuration);
            setPC(pc);

            // Connection state monitoring
            pc.onconnectionstatechange = () => {
                console.log("Connection state:", pc.connectionState);
                setConnectionStatus(pc.connectionState);
            };

            pc.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", pc.iceConnectionState);
            };

            socket.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log("Received message:", message.type);
                
                if (message.type === 'answer') {
                    try {
                        await pc.setRemoteDescription(message.sdp);
                        console.log("Remote description set successfully");
                    } catch (error) {
                        console.error("Error setting remote description:", error);
                    }
                } else if (message.type === 'iceCandidate' && message.candidate) {
                    try {
                        await pc.addIceCandidate(message.candidate);
                        console.log("ICE candidate added successfully");
                    } catch (error) {
                        console.error("Error adding ICE candidate:", error);
                    }
                }
            }

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("Sending ICE candidate");
                    socket?.send(JSON.stringify({
                        type: 'iceCandidate',
                        candidate: event.candidate
                    }));
                }
            }

            pc.onnegotiationneeded = async () => {
                try {
                    console.log("Negotiation needed");
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log("Sending offer");
                    socket?.send(JSON.stringify({
                        type: 'create-offer',
                        sdp: pc.localDescription
                    }));
                } catch (error) {
                    console.error("Error during negotiation:", error);
                }
            }

            try {
                console.log("Requesting audio stream");
                const stream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
                stream.getTracks().forEach((track) => {
                    console.log("Adding track:", track.kind);
                    pc.addTrack(track, stream);
                });
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }

        } catch (error) {
            console.error("Error in initiateConn:", error);
        }
    }

    return (
        <div>
            <h2>Sender</h2>
            <div>Connection Status: {connectionStatus}</div>
            <button onClick={initiateConn}>Start Sending Audio</button>
        </div>
    );
}
