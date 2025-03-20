import { useEffect } from "react"

export const Receiver = () => {
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
        // const video = document.createElement('video');
        // document.body.appendChild(video);

        const pc: RTCPeerConnection = new RTCPeerConnection();
        // pc.ontrack = (event) => {
        //     video.srcObject = new MediaStream([event.track]);
        //     video.play();
        // }

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

    return <div>
        Receiver
    </div>
}