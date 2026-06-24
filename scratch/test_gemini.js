import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from chatbot-server
dotenv.config({ path: path.join(__dirname, '../chatbot-server/.env') });

console.log('API Key to test:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'none');

if (!process.env.GEMINI_API_KEY) {
    console.error('No GEMINI_API_KEY found!');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        console.log('Testing connection to Gemini...');
        // We will try gemini-1.5-flash since it's widely supported
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hi, reply with one word: OK');
        console.log('Response:', result.response.text());
        console.log('✅ Gemini API Key is VALID!');
    } catch (err) {
        console.error('❌ Gemini API call failed with error:');
        console.error(err);
    }
}

run();
