import mongoose from 'mongoose';
import Category from "../model/category.model.js";
import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper function to save base64 image
const saveBase64Image = (base64String, uploadPath, req) => {
    try {
        // Extract the base64 data and file extension
        const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 string');
        }
        
        const fileExtension = matches[1].split('/')[1] || 'png';
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = path.join(uploadPath, fileName);
        
        // Convert base64 to buffer and write to file
        const fileData = matches[2];
        const buffer = Buffer.from(fileData, 'base64');
        
        fs.writeFileSync(filePath, buffer);
        
        // Return the full URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return `${baseUrl}/uploads/${fileName}`;
    } catch (error) {
        console.error('Error saving base64 image:', error);
        throw new Error('Failed to process image');
    }
};

export const createCategory = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, image } = req.body;
        let imageUrl = '';
        
        // Handle base64 image upload
        if (image && image.startsWith('data:image')) {
            const uploadPath = path.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            try {
                imageUrl = saveBase64Image(image, uploadPath, req);
            } catch (error) {
                console.error('Error saving image:', error);
                return res.status(400).json({ message: 'Failed to process image' });
            }
        } else if (image) {
            // If it's already a URL, use it as is
            // If it's a relative path, convert to full URL
            imageUrl = image.startsWith('http') ? image : `${req.protocol}://${req.get('host')}${image}`;
        }
        
        // Get base URL from request
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fullImageUrl = imageUrl ? `${baseUrl}${imageUrl}` : '';
        
        // Save the category with image URL
        const category = new Category({
            name,
            description: description || '',
            image: fullImageUrl, // Store full URL
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            showOnHome: req.body.showOnHome || false
        });

        const savedCategory = await category.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image, isActive, showOnHome } = req.body;
        
        let updateData = { 
            name, 
            description, 
            isActive,
            showOnHome: showOnHome || false
        };
        
        // Handle image update if provided
        if (image) {
            if (image.startsWith('data:image')) {
                const uploadPath = path.join(process.cwd(), 'public', 'uploads');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                
                try {
                    imageUrl = saveBase64Image(image, uploadPath, req);
                } catch (error) {
                    console.error('Error saving image:', error);
                    return res.status(400).json({ message: 'Failed to process image' });
                }
            } else {
                imageUrl = image; // Use as is if it's a URL
            }
            
            // Get base URL from request
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            // Update the category with the new image URL
            if (imageUrl) {
                updateData.image = `${baseUrl}${imageUrl}`; // Store full URL
            }
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if any books are using this category
        const booksCount = await Book.countDocuments({ category: id });
        if (booksCount > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete category with associated books' 
            });
        }

        const category = await Category.findByIdAndDelete(id);
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllCategories = async (req, res) => {
    try {
        console.log('Attempting to fetch categories...');
        console.log('Mongoose connection state:', mongoose.connection.readyState);
        
        // Check if model is defined
        if (!Category) {
            console.error('Category model is not defined');
            return res.status(500).json({ message: 'Category model not available' });
        }
        
        // Build query
        const query = {};
        
        // Add showOnHome filter if provided
        if (req.query.showOnHome === 'true') {
            query.showOnHome = true;
        }
        
        // Add status filter if provided
        if (req.query.status === 'active') {
            query.isActive = true;
        } else if (req.query.status === 'inactive') {
            query.isActive = false;
        }
        
        // Build sort
        let sort = { name: 1 }; // Default sort by name
        if (req.query.sort) {
            if (req.query.sort.startsWith('-')) {
                sort = { [req.query.sort.substring(1)]: -1 };
            } else {
                sort = { [req.query.sort]: 1 };
            }
        }
        
        // Build fields
        let selectFields = '';
        if (req.query.fields) {
            selectFields = req.query.fields.split(',').join(' ');
        }
        
        // Execute query
        let queryBuilder = Category.find(query).sort(sort);
        
        // Apply field selection if specified
        if (selectFields) {
            queryBuilder = queryBuilder.select(selectFields);
        }
        
        // Apply limit if specified
        if (req.query.limit) {
            queryBuilder = queryBuilder.limit(parseInt(req.query.limit));
        }
        
        const categories = await queryBuilder.exec();
        
        // Ensure all categories have proper image URLs
        const categoriesWithImages = categories.map(category => {
            const categoryObj = category.toObject();
            
            // If image is already a full URL, use it as is
            // If it's a relative path, make it absolute
            if (categoryObj.image) {
                if (!categoryObj.image.startsWith('http')) {
                    // If it starts with /uploads, it's already a path
                    categoryObj.image = `http://localhost:5000${categoryObj.image}`;
                }
            }
            
            return categoryObj;
        });
        
        console.log('Successfully fetched categories:', categoriesWithImages.length);
        res.json(categoriesWithImages);
    } catch (error) {
        console.error('Error fetching categories:', error);
        if (error.name === 'MongoServerError') {
            console.error('MongoDB Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('MongoDB connection refused. Is MongoDB running?');
            }
        }
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        // Ensure the category has a proper image URL
        const categoryObj = category.toObject();
        
        // If image is already a full URL, use it as is
        // If it's a relative path, make it absolute
        if (categoryObj.image) {
            if (!categoryObj.image.startsWith('http')) {
                // If it starts with /uploads, it's already a path
                categoryObj.image = `http://localhost:5000${categoryObj.image}`;
            }
        }
        
        res.json(categoryObj);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
