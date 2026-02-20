import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/user.model.js';

dotenv.config();

const URI = process.env.MongoDBURI;

async function listUsers() {
    try {
        await mongoose.connect(URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        // Get all users (excluding password hashes for security)
        const users = await User.find({}, { password: 0 });
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listUsers();
