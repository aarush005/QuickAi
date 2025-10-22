import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary  from './config/cloudinary.js';


const app = express()



await connectCloudinary()

app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())
 

app.use(requireAuth())

app.get('/', (req, res)=>res.send('Server is Live!'))

app.use('/api/ai', aiRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port', PORT)
})

