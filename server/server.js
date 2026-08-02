import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary  from './config/cloudinary.js';
import userRouter from './routes/userRoutes.js';
import multer from 'multer';

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({});

const app = express()

await connectCloudinary()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.post('/upload', upload.any(), handleUpload);
app.use(clerkMiddleware())
 

app.use(requireAuth())

app.get('/', (req, res)=>res.send('Server is Live!'))

app.use('/api/ai', aiRouter)
app.use('/api/user', userRouter)


app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});



const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port', PORT)
})

