import dotenv from 'dotenv';
dotenv.config({ path: '/home/sama/projects/perfume/backend/.env' });
import { handleChat } from './controllers/aiController.js';

// mock req, res
const req = {
  body: {
    messages: [
      { role: 'model', content: 'Hello! I am your AURELIA fragrance assistant. How can I help you find your perfect scent today?' },
      { role: 'user', content: 'What is a good summer perfume?' }
    ]
  }
};

const res = {
  json: (data) => console.log('RESPONSE:', data),
  status: (code) => ({
    json: (data) => console.log(`STATUS ${code}:`, data)
  })
};

handleChat(req, res);
