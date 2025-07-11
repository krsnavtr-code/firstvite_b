import mongoose from 'mongoose';
import Category from "../model/category.model.js";
import { validationResult } from 'express-validator';


export const createCategory = async (req, res) => {
    try {
        console.log('Received create category request with body:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { name, description, isActive = true, showOnHome = false } = req.body;
        
        console.log('Creating category with data:', {
            name,
            description,
            isActive,
            showOnHome
        });
        
        // Check if category with same name already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            console.log('Category with this name already exists:', existingCategory);
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }
        
        // Save the category
        const category = new Category({
            name,
            description: description || '',
            isActive,
            showOnHome
        });

        const savedCategory = await category.save();
        console.log('Category created successfully:', savedCategory);
        
        res.status(201).json({
            success: true,
            data: savedCategory
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Received update request for category ID:', id);
        console.log('Request body:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { name, description, isActive, showOnHome } = req.body;
        
        // Verify the category exists first
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            console.log('Category not found with ID:', id);
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }
        
        // Check if another category with the same name exists
        if (name && name !== existingCategory.name) {
            const duplicateCategory = await Category.findOne({ name });
            if (duplicateCategory) {
                console.log('Another category with this name already exists:', duplicateCategory);
                return res.status(400).json({
                    success: false,
                    message: 'Another category with this name already exists'
                });
            }
        }
        
        console.log('Existing category before update:', {
            _id: existingCategory._id,
            name: existingCategory.name,
            description: existingCategory.description,
            isActive: existingCategory.isActive,
            showOnHome: existingCategory.showOnHome,
            updatedAt: existingCategory.updatedAt
        });
        
        // Build update object with only provided fields
        const updateData = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (showOnHome !== undefined) updateData.showOnHome = showOnHome;
        
        console.log('Preparing update with data:', updateData);
        
        try {
            // Perform the update
            const updatedCategory = await Category.findByIdAndUpdate(
                id,
                { $set: updateData },
                { 
                    new: true, 
                    runValidators: true, 
                    context: 'query',
                    useFindAndModify: false // Ensure we're using the new MongoDB driver
                }
            );

            if (!updatedCategory) {
                console.error('Failed to update category - no document was returned');
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to update category - document not found after update' 
                });
            }
            
            console.log('Category updated successfully:', {
                _id: updatedCategory._id,
                name: updatedCategory.name,
                isActive: updatedCategory.isActive,
                showOnHome: updatedCategory.showOnHome,
                updatedAt: updatedCategory.updatedAt
            });

            return res.json({
                success: true,
                message: 'Category updated successfully',
                data: updatedCategory
            });
            
        } catch (dbError) {
            console.error('Database error during update:', dbError);
            throw dbError;
        }
    } catch (error) {
        console.error('Error updating category:', error);
        
        if (error.name === 'ValidationError') {
            // Handle validation errors
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors 
            });
        }
        
        // Handle duplicate key error (unique index violation)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `A category with this ${field} already exists`
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    console.log(`Received delete request for category ID: ${id}`);
    
    // Start a MongoDB session for transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // 1. Check if category exists
        const category = await Category.findById(id).session(session);
        if (!category) {
            console.log(`Category not found with ID: ${id}`);
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }
        
        console.log('Found category to delete:', {
            _id: category._id,
            name: category.name,
            bookCount: category.bookCount
        });
        
        // 2. Check if any books are using this category
        const Book = mongoose.model('Book');
        const booksCount = await Book.countDocuments({ category: id }).session(session);
        
        if (booksCount > 0) {
            console.log(`Cannot delete category - found ${booksCount} associated books`);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false,
                message: `Cannot delete category - it has ${booksCount} associated book(s)`,
                bookCount: booksCount
            });
        }
        
        // 3. Delete the category
        const deletedCategory = await Category.findByIdAndDelete(id)
            .session(session);
            
        if (!deletedCategory) {
            console.error('Category was not deleted - unknown error');
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({ 
                success: false,
                message: 'Failed to delete category' 
            });
        }
        
        // 4. If we got here, everything is good - commit the transaction
        await session.commitTransaction();
        session.endSession();
        
        console.log(`Successfully deleted category: ${deletedCategory._id} - ${deletedCategory.name}`);
        
        res.json({ 
            success: true,
            message: 'Category deleted successfully',
            data: {
                _id: deletedCategory._id,
                name: deletedCategory.name
            }
        });
        
    } catch (error) {
        // If we get here, something went wrong - abort the transaction
        console.error('Error in deleteCategory:', error);
        
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        
        // Handle specific error types
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }
        
        // Default error response
        res.status(500).json({ 
            success: false,
            message: 'Server error while deleting category',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        // Ensure the session is always ended
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        if (session.inTransaction() || session.id) {
            session.endSession();
        }
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
