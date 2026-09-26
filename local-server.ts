import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleChatWithGemini } from './server/geminiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    const reply = await handleChatWithGemini(messages);
    return res.json({ reply });
  } catch (error: unknown) {
    console.error('Server chat error:', error instanceof Error ? error.name : 'Unknown error');
    const missingApiKey = error instanceof Error && error.message === 'GEMINI_API_KEY is not configured';
    return res.status(missingApiKey ? 503 : 500).json({
      error: missingApiKey
        ? 'Máy chủ chưa cấu hình GEMINI_API_KEY.'
        : 'Trợ lý đang tạm gián đoạn. Vui lòng thử lại sau.',
    });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});