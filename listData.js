import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from './model/book.model.js';
import User from './model/user.model.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const URI = process.env.MongoDBURI;

async function listAllData() {
    try {
        await mongoose.connect(URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        // List all databases (admin access required)
        const adminDb = mongoose.connection.db.admin();
        const dbs = await adminDb.listDatabases();
        dbs.databases.forEach(db => console.log(`- ${db.name}`));
        
        // Get current database name from connection
        const dbName = mongoose.connection.name;
        
        // List collections in the current database
        const collections = await mongoose.connection.db.listCollections().toArray();
        collections.forEach(collection => console.log(`- ${collection.name}`));
        
        // Get data from each collection
        for (const collection of collections) {
            const collectionName = collection.name;
            
            try {
                const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
                console.log(JSON.stringify(data, null, 2));
            } catch (err) {
                console.error(`Error fetching data from ${collectionName}:`, err.message);
            }
        }
        
        // Close the connection
        await mongoose.connection.close();
        console.log('\nConnection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listAllData();
