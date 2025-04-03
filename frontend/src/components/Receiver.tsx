import { useEffect, useRef, useState } from "react"

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'identify-as-receiver'
            }));
        }
        startReceiving(socket);
    }, []);

    function startReceiving(socket: WebSocket) {
        const pc: RTCPeerConnection = new RTCPeerConnection();
        pc.ontrack = (event) => {
            console.log(`Received ${JSON.stringify(event.track)}`);
            if (videoRef.current) {
                videoRef.current.srcObject = new MediaStream([event.track]);
            }
        }

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'offer') {
                console.log("1", message)
                pc.setRemoteDescription(message.sdp).then(() => {
                    pc.createAnswer().then((answer) => {
                        pc.setLocalDescription(answer);
                        socket.send(JSON.stringify({
                            type: 'create-answer',
                            sdp: answer
                        }));
                    });
                });
            }
            else if (message.type === 'iceCandidate') {
                pc.addIceCandidate(message.candidate);
            }
        }
    }

    const handlePlay = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setIsPlaying(true);
            } catch (error) {
                console.error('Error playing video:', error);
            }
        }
    };

    return (
        <div>
            <h2>Receiver</h2>
            <video 
                ref={videoRef}
                style={{ width: '100%', maxWidth: '640px' }}
                playsInline
            />
            {!isPlaying && (
                <button onClick={handlePlay}>
                    Play Video
                </button>
            )}
        </div>
    );
}