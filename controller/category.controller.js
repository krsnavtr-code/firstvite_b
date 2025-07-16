import mongoose from 'mongoose';
import Category from "../model/category.model.js";
import Book from "../model/book.model.js";
import { validationResult } from 'express-validator';

// Get all categories with optional filters
export const getAllCategories = async (filters = {}) => {
    try {
        const { status, fields, sort, limit, page = 1 } = filters;
        
        // Build query
        const query = {};
        if (status) query.status = status;
        
        // Build projection
        const projection = fields ? fields.split(',').join(' ') : {};
        
        // Build sort
        const sortOptions = sort ? { [sort]: 1 } : { name: 1 };
        
        // Pagination
        const skip = (page - 1) * limit;
        
        // Get total count
        const total = await Category.countDocuments(query);
        
        // Build query builder
        let queryBuilder = Category.find(query, projection)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
        
        // Execute query
        const categories = await queryBuilder.lean();
        
        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        
        return {
            success: true,
            data: categories,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    } catch (error) {
        console.error('Error in getAllCategories:', error);
        throw error;
    }
};


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

        const { name, description, isActive = true, showOnHome = false, master = false, image } = req.body;
        
        console.log('Creating category with data:', {
            name,
            description,
            isActive,
            showOnHome,
            master,
            image
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
            showOnHome,
            master,
            image: image || null
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
        console.log('=== UPDATE CATEGORY REQUEST ===');
        console.log('Category ID:', id);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        // Check if ID is valid (should be caught by middleware, but just in case)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid category ID format:', id);
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
        }
        
        // Verify the category exists first
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            console.error('Category not found with ID:', id);
            return res.status(404).json({ 
                success: false,
                message: 'Category not found',
                error: 'CATEGORY_NOT_FOUND'
            });
        }
        
        const { name, description, isActive, showOnHome, image } = req.body;
        
        // Check if another category with the same name exists (if name is being updated)
        if (name && name !== existingCategory.name) {
            const duplicateCategory = await Category.findOne({ name });
            if (duplicateCategory) {
                console.error('Category name already exists:', name);
                return res.status(409).json({
                    success: false,
                    message: 'A category with this name already exists',
                    error: 'DUPLICATE_CATEGORY_NAME',
                    field: 'name'
                });
            }
        }
        
        console.log('Existing category data:', {
            _id: existingCategory._id,
            name: existingCategory.name,
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
        if (image !== undefined) updateData.image = image;
        
        console.log('Updating with data:', updateData);
        
        // Perform the update
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { $set: updateData },
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).lean();

        if (!updatedCategory) {
            console.error('Failed to update category - no document was returned');
            return res.status(500).json({ 
                success: false,
                message: 'Failed to update category',
                error: 'UPDATE_FAILED'
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
        
    } catch (error) {
        console.error('Error updating category:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                errors 
            });
        }
        
        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `A category with this ${field} already exists`,
                error: 'DUPLICATE_KEY',
                field
            });
        }
        
        // Handle cast errors (invalid ObjectId)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
        }
        
        // Generic server error
        res.status(500).json({ 
            success: false,
            message: 'An error occurred while updating the category',
            error: 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    console.log(`[Category] Delete request received for category ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error(`[Category] Invalid category ID format: ${id}`);
        return res.status(400).json({
            success: false,
            message: 'Invalid category ID format',
            error: 'INVALID_ID_FORMAT'
        });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log(`[Category] Starting transaction for category ID: ${id}`);
        
        // 1. Check if category exists
        const category = await Category.findById(id).session(session).lean();
        if (!category) {
            console.error(`[Category] Category not found with ID: ${id}`);
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false,
                message: 'Category not found',
                error: 'CATEGORY_NOT_FOUND'
            });
        }
        
        console.log('[Category] Found category to delete:', {
            _id: category._id,
            name: category.name,
            bookCount: category.bookCount
        });
        
        // 2. Check if any books are using this category
        try {
            const booksCount = await Book.countDocuments({ category: id }).session(session);
            console.log(`[Category] Found ${booksCount} books associated with category ${id}`);
            
            if (booksCount > 0) {
                console.error(`[Category] Cannot delete - ${booksCount} books are associated with this category`);
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false,
                    message: `Cannot delete category - it has ${booksCount} associated book(s)`,
                    error: 'CATEGORY_IN_USE',
                    bookCount: booksCount
                });
            }
        } catch (error) {
            console.error('[Category] Error checking for associated books:', error);
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({
                success: false,
                message: 'Error checking for associated books',
                error: 'BOOK_CHECK_ERROR',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        // 3. Delete the category
        let deletedCategory;
        try {
            console.log(`[Category] Attempting to delete category ${id}`);
            deletedCategory = await Category.findByIdAndDelete(id)
                .session(session)
                .lean();
                
            if (!deletedCategory) {
                console.error(`[Category] Failed to delete - no document was deleted for ID: ${id}`);
                await session.abortTransaction();
                session.endSession();
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to delete category - no document was deleted',
                    error: 'DELETE_FAILED'
                });
            }
            
            // 4. If we got here, everything is good - commit the transaction
            console.log(`[Category] Category ${id} deleted successfully, committing transaction`);
            await session.commitTransaction();
            session.endSession();
            
            console.log(`[Category] Successfully deleted category: ${deletedCategory._id} - ${deletedCategory.name}`);
            
            return res.json({ 
                success: true,
                message: 'Category deleted successfully',
                data: {
                    _id: deletedCategory._id,
                    name: deletedCategory.name
                }
            });
            
        } catch (deleteError) {
            console.error('[Category] Error during category deletion:', deleteError);
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            
            // Handle specific MongoDB errors
            if (deleteError.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID format',
                    error: 'INVALID_ID_FORMAT'
                });
            }
            
            // Handle duplicate key errors (shouldn't happen on delete, but just in case)
            if (deleteError.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'A category with this name already exists',
                    error: 'DUPLICATE_CATEGORY'
                });
            }
            
            // Default error response
            return res.status(500).json({
                success: false,
                message: 'An error occurred while deleting the category',
                error: 'DELETE_ERROR',
                details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
            });
        }
        
    } catch (error) {
        // If we get here, something went wrong - abort the transaction
        console.error('Error in deleteCategory:', error);
        
        // Log the full error for debugging
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        if (session.inTransaction()) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error('Error aborting transaction:', abortError);
            }
        }
        
        // Handle specific error types
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
        }
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A category with this name already exists',
                error: 'DUPLICATE_CATEGORY'
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                errors
            });
        }
        
        // Default error response
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred while deleting the category',
            error: 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        // Ensure the session is always properly cleaned up
        try {
            if (session.inTransaction()) {
                console.log('[Category] Aborting any pending transaction in finally block');
                await session.abortTransaction();
            }
            
            if (session.id) {
                console.log('[Category] Ending session in finally block');
                await session.endSession();
            }
        } catch (cleanupError) {
            console.error('[Category] Error during session cleanup:', cleanupError);
            // Don't throw from finally block
        }
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Double-check the ID format for extra safety
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
        }
        
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found',
                error: 'CATEGORY_NOT_FOUND'
            });
        }
        
        // Convert to plain JavaScript object
        const categoryData = category.toObject();
        
        res.json({
            success: true,
            data: categoryData
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                error: 'INVALID_CATEGORY_ID'
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching category',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
