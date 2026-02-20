import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BlogPost from './model/BlogPost.js';

dotenv.config();

async function listBlogPosts() {
  try {
    await mongoose.connect(process.env.MongoDBURI);
    const posts = await BlogPost.find({}, 'title slug status createdAt').sort({ createdAt: -1 });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listBlogPosts();
