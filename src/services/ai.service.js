const {GoogleGenAI} = require("@google/genai");
const { model } = require("mongoose");

const ai = new GoogleGenAI({});

const generateResponse = async (content) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: content
    });

    return response.text;
}

module.exports = generateResponse;