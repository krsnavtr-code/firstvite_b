import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BlogPost from './model/BlogPost.js';

dotenv.config();

async function listBlogPosts() {
  try {
    await mongoose.connect(process.env.MongoDBURI);
    console.log('Connected to MongoDB');
    
    const posts = await BlogPost.find({}, 'title slug status createdAt').sort({ createdAt: -1 });
    
    console.log('\n=== Blog Posts ===');
    console.log(`Found ${posts.length} posts\n`);
    
    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Created: ${post.createdAt}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listBlogPosts();
