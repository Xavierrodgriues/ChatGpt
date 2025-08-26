const {Pinecone} = require("@pinecone-database/pinecone");

const pc = new Pinecone({apiKey: process.env.PINECONE_API_KEY});

const cohortChatGpt = pc.Index("cohort-chat-gpt");

const createMemory = async ({vectors, metadata, messageId}) => {
    await cohortChatGpt.upsert([
        {
            id: messageId,
            values: vectors,
            metadata

        }
    ])
}

const queryMemory = async ({queryVector, limit=5, metadata}) => {
    const data = await cohortChatGpt.query({
        vector: queryVector,
        topK: limit,
        filter: metadata ? metadata : undefined,
        includeMetadata: true
    });

    return data.matches;
}

module.exports = {
    createMemory,
    queryMemory
}