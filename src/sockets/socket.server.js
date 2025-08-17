const {Server} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const generateResponse = require("../services/ai.service");
const messageModel = require("../models/message.model");

const initSocketServer = (httpServer) => {
    const io = new Server(httpServer, {} );

    //authentication middleware
    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
        const token = cookies.token;

        if(!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);
            socket.user = user;
        }catch (err){
            return next(new Error("Authentication error: Invalid token"));
        }

        next();
    }) 

    // Handle socket connections
    io.on("connection", (socket) => { 

        socket.on("ai-message", async(messagePayload) => {
            // console.log(messagePayload);

            await messageModel.create({
                user: socket.user._id,
                chat: messagePayload.chat,
                content: messagePayload.content,
                role: "user"
            });

            const chatHistory = await messageModel.find({chat: messagePayload.chat});
            // console.log();

            const response = await generateResponse(chatHistory.map((item) => {
                return {
                    role: item.role,
                    parts: [{text: item.content}]
                }
            }));

            await messageModel.create({
                user: socket.user._id,
                chat: messagePayload.chat,
                content: response,
                role: "model"
            });


            socket.emit("ai-response", {
                content: response,
                chat: messagePayload.chat,
            });
        });
    });
}

module.exports = initSocketServer;