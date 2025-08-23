const {Server} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const {generateResponse, generateVector} = require("../services/ai.service");
const messageModel = require("../models/message.model");
const {createMemory, queryMemory} = require("../services/vector.service");

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

           const message = await messageModel.create({
                user: socket.user._id,
                chat: messagePayload.chat,
                content: messagePayload.content,
                role: "user"
            });

            const vectors = await generateVector(messagePayload.content);

            const memory = await queryMemory({
                queryVector: vectors, 
                limit: 3,
                metadata: {
                    
                }
            });
            
            await createMemory({
                vectors,
                messageId: message._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: messagePayload.content
                }
            });

            const chatHistory = (await messageModel.find({chat: messagePayload.chat}).sort({createdAt: 1}).limit(20).lean()).reverse();

            const stm = chatHistory.map((item) => {
                return {
                    role: item.role,
                    parts: [{text: item.content}]
                }
            });

            const ltm = [
                {
                    role: "user",
                    parts: [{text: `
                        
                        these are some previousmessages from the chat, use them to generate a response
                        ${memory.map(item => item.metadata.text).join("\n")}
                        `}]
                }
            ]

            const response = await generateResponse([...ltm, ...stm]);

            const responseMessage = await messageModel.create({
                user: socket.user._id,
                chat: messagePayload.chat,
                content: response,
                role: "model"
            });

            const responseVector = await generateVector(response);

            await createMemory({
                vectors: responseVector,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }

            })


            socket.emit("ai-response", {
                content: response,
                chat: messagePayload.chat,
            });
        });
    });
}

module.exports = initSocketServer;