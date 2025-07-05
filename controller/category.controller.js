import mongoose from 'mongoose';
import Category from "../model/category.model.js";
import { validationResult } from 'express-validator';

export const createCategory = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, image } = req.body;
        
        const category = new Category({
            name,
            description,
            image: image || ''
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image, isActive } = req.body;

        const category = await Category.findByIdAndUpdate(
            id,
            { name, description, image, isActive },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
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
        
        const categories = await Category.find({}).sort({ name: 1 });
        console.log('Successfully fetched categories:', categories.length);
        res.json(categories);
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
        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
