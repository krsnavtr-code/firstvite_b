import mongoose from 'mongoose';
import Category from "../model/category.model.js";
import { validationResult } from 'express-validator';


export const createCategory = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description } = req.body;
        
        // Save the category
        const category = new Category({
            name,
            description: description || '',
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
        const { name, description, isActive, showOnHome } = req.body;
        
        // Build update object with only provided fields
        const updateData = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (showOnHome !== undefined) updateData.showOnHome = showOnHome;
        
        console.log('Updating category with data:', updateData);
        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true, context: 'query' }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        if (error.name === 'ValidationError') {
            // Handle validation errors
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
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
