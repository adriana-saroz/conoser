Conoser
=======
Web application that uses web real time communication to combine collaborative code editing and live video communication.

In order to achieve consistency of concurrent changes it uses a text synchronization algorithm adapted for very large peer-to-peer networks. Most of the data transfer, including the text synchronization and audio/video streaming is done between peers (browser instances). The server component is completely eliminated from the synchronization process and video streaming thus proving small infrastructure costs and low latency.

### Install Guide ###
* Install [Node.js](http://nodejs.org/).
* Install [Socket.io](http://socket.io/). `npm install socket.io`

### Setting Up The Project ###
* Start server. `node server.js`
* Access application at http://127.0.0.1:8888/

### Compatibility ###
* Tested with Firefox 25
* Tested with Chrome 27