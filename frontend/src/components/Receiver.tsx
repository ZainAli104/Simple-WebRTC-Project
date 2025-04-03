import { useEffect, useRef, useState } from "react"

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>("Not Connected");
    const [hasTrack, setHasTrack] = useState(false);
    const [trackTypes, setTrackTypes] = useState<{audio: boolean, video: boolean}>({ audio: false, video: false });

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

        // Keep track of received tracks
        const receivedTracks: MediaStream = new MediaStream();

        pc.ontrack = (event) => {
            console.log(`Received track:`, event.track);
            setHasTrack(true);
            
            // Update track type status
            setTrackTypes(prev => ({
                ...prev,
                [event.track.kind]: true
            }));

            if (videoRef.current) {
                receivedTracks.addTrack(event.track);
                videoRef.current.srcObject = receivedTracks;
                
                // If it's a video track, try to play immediately
                if (event.track.kind === 'video') {
                    videoRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(error => console.error('Error auto-playing:', error));
                }
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
                console.log("Media playback started");
            } catch (error) {
                console.error('Error playing media:', error);
            }
        }
    };

    return (
        <div>
            <h2>Receiver</h2>
            <div>Connection Status: {connectionStatus}</div>
            <div>Tracks Received: 
                {trackTypes.audio && ' Audio'} 
                {trackTypes.video && ' Video'}
                {!trackTypes.audio && !trackTypes.video && ' None'}
            </div>
            <div style={{ marginTop: '1rem' }}>
                <video 
                    ref={videoRef}
                    style={{ 
                        width: '100%', 
                        maxWidth: '640px',
                        backgroundColor: '#ddd'
                    }}
                    playsInline
                    controls // Add controls for volume adjustment
                />
            </div>
            {!isPlaying && hasTrack && (
                <button onClick={handlePlay}>
                    Play Media
                </button>
            )}
        </div>
    );
}