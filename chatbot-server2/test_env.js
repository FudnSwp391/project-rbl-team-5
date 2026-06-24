import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Loading envs...");
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
console.log("After backend env: GEMINI_API_KEY =", process.env.GEMINI_API_KEY);

dotenv.config({ path: path.join(__dirname, '.env') });
console.log("After local env: GEMINI_API_KEY =", process.env.GEMINI_API_KEY);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
console.log("After root env: GEMINI_API_KEY =", process.env.GEMINI_API_KEY);
