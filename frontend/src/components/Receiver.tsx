import { useEffect, useRef, useState } from "react"

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>("Not Connected");
    const [hasTrack, setHasTrack] = useState(false);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        console.log("Receiver component mounted");
        
        socket.onopen = () => {
            console.log("WebSocket connected");
            socket.send(JSON.stringify({
                type: 'identify-as-receiver'
            }));
        }

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        }

        startReceiving(socket);

        return () => {
            socket.close();
        }
    }, []);

    function startReceiving(socket: WebSocket) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        pc.onconnectionstatechange = () => {
            console.log("Connection state:", pc.connectionState);
            setConnectionStatus(pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE connection state:", pc.iceConnectionState);
        };

        pc.ontrack = (event) => {
            console.log(`Received track:`, event.track);
            setHasTrack(true);
            
            if (videoRef.current) {
                const stream = new MediaStream([event.track]);
                videoRef.current.srcObject = stream;
                console.log("Track added to video element");
            }
        }

        socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("Received message:", message.type);

                if (message.type === 'offer') {
                    console.log("Processing offer");
                    await pc.setRemoteDescription(message.sdp);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.send(JSON.stringify({
                        type: 'create-answer',
                        sdp: answer
                    }));
                    console.log("Answer sent");
                }
                else if (message.type === 'iceCandidate' && message.candidate) {
                    try {
                        await pc.addIceCandidate(message.candidate);
                        console.log("ICE candidate added successfully");
                    } catch (error) {
                        console.error("Error adding ICE candidate:", error);
                    }
                }
            } catch (error) {
                console.error("Error processing message:", error);
            }
        }
    }

    const handlePlay = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setIsPlaying(true);
                console.log("Audio playback started");
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        }
    };

    return (
        <div>
            <h2>Receiver</h2>
            <div>Connection Status: {connectionStatus}</div>
            <div>Track Status: {hasTrack ? "Track Received" : "Waiting for Track"}</div>
            <audio 
                ref={videoRef}
                style={{ width: '100%', maxWidth: '640px' }}
                controls
                playsInline
            />
            {!isPlaying && hasTrack && (
                <button onClick={handlePlay}>
                    Play Audio
                </button>
            )}
        </div>
    );
}