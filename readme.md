# 360 live video web interface

## Technology used
- [WebRTC](https://webrtc.org/) - p2p video and audio transmission optimized for low latency
- [A-Frame](https://aframe.io/) - framework for VR in browser, comes with useful 360 video player
- [PeerJS](https://peerjs.com/) - WebRTC abstraction library, makes it easier to set up signaling server and make calls

## Major components
- [PeerJS server](https://github.com/peers/peerjs-server)
- client_robot - web interface to run broadcast from robot
- client_user - web interface to call the robot, receive the broadcast and display it in 360 video player

## How to use it
### Server setup
HTTPS server is necessary to run client_robot and client_user interfaces. Web browsers won't allow for webcam and microphone access otherwise. Instructions for running PeerJS server are located [here](https://github.com/peers/peerjs-server).

### Operation
1. Open client_robot web interface on the computer with webcam plugged in.
2. Allow for camera and microphone access. The robot client is now ready to receive a call.
3. Open client_user web interface on the remote computer.
4. Click "call" button. The video stream should appear on the screen.
5. Look around the 360 video by dragging it with your mouse.

## Additional considerations
### TURN server not used
TURN server is not used here yet, which might make it impossible to establish p2p connection in some network setups. In those cases WebRTC usually relies on TURN server to relay the data sent between peers. There are no free TURN servers available as they are relatively expensive to run. It is possible to run an own TURN server if necessary using one of available open source implementations.

### client_user relies on modified PeerJS library
Additional parameter needs to be passed to createOffer() function to make one-way video call request possible. It was not exposed in PeerJS API so internal library modification was necessary. Some functionality might have got unintentionally broken in the process.
