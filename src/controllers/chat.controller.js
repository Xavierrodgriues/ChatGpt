const chatModel = require("../models/chat.model");

const createChat = async (req, res) => {
    const {title} = req.body;
    const user = req.user;

    const chat = await chatModel.create({
        user: user._id,
        title: title
    });

    res.status(201).json({
        message: "Chat created successfully",
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
        }
    });
}

module.exports = {
    createChat
};