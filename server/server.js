import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary  from './config/cloudinary.js';
import userRouter from './routes/userRoutes.js';
import multer from 'multer';

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


const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port', PORT)
})

