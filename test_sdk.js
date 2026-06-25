require('dotenv').config({ path: './backend/.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testSDK() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("API Key exists:", !!apiKey);
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are a helpful assistant." 
        });

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "Hello" }] },
                { role: "model", parts: [{ text: "Hi there! How can I help?" }] }
            ]
        });

        const result = await chat.sendMessage("I need some advice on selling an iPhone.");
        const response = await result.response;
        console.log("Response:", response.text());
    } catch (error) {
        console.error("SDK Error:", error);
    }
}

testSDK();
