const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io')

const app = express();
app.use(express.static("views"))
app.use(cors());
app.get('/', (req, res) => {
    res.send('hello, word!');
})

const server = app.listen(3000, () => {
    console.log('server is running on http://localhost:3000')
})

const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: "*",
        credentials: true
    },
});

let rooms = {};
let socketToRoom = {};

io.on("connection", socket => {
    socket.on("join", data => {
        // let a new user join to the room
        const roomId = data.room
        socket.join(roomId);
        socketToRoom[socket.id] = roomId;

        // persist the new user in the room
        if (rooms[roomId]) {
            rooms[roomId].push({ id: socket.id, name: data.name });
        } else {
            rooms[roomId] = [{ id: socket.id, name: data.name }];
        }

        // sends a list of joined users to a new user
        const users = rooms[data.room].filter(user => user.id !== socket.id);
        io.sockets.to(socket.id).emit("room_users", users);
        console.log("[joined] room:" + data.room + " name: " + data.name);
    });

    socket.on("offer", sdp => {
        socket.broadcast.emit("getOffer", sdp);
        console.log("offer: " + socket.id);
    });

    socket.on("answer", sdp => {
        socket.broadcast.emit("getAnswer", sdp);
        console.log("answer: " + socket.id);
    });

    socket.on("candidate", candidate => {
        socket.broadcast.emit("getCandidate", candidate);
        console.log("candidate: " + socket.id);
    });

    socket.on("disconnect", () => {
        const roomId = socketToRoom[socket.id];
        let room = rooms[roomId];
        if (room) {
            room = room.filter(user => user.id !== socket.id);
            rooms[roomId] = room;
        }
        socket.broadcast.to(room).emit("user_exit", { id: socket.id });
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
    });
});