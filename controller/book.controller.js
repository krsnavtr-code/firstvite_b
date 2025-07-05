import Book from "../model/book.model.js";
import { validationResult } from 'express-validator';

export const createBook = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            title, 
            description, 
            price, 
            category, 
            image, 
            instructor, 
            duration, 
            level 
        } = req.body;

        const book = new Book({
            title,
            description,
            price,
            category,
            image,
            instructor,
            duration,
            level
        });

        await book.save();
        res.status(201).json(book);
    } catch (error) {
        console.error('Error creating book:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const book = await Book.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).populate('category', 'name');

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findByIdAndDelete(id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllBooks = async (req, res) => {
    try {
        const { category, level, search, page = 1, limit = 10 } = req.query;
        const query = { isPublished: true };
        
        if (category) query.category = category;
        if (level) query.level = level;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { instructor: { $regex: search, $options: 'i' } }
            ];
        }

        const books = await Book.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Book.countDocuments(query);

        res.json({
            books,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalItems: count
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('category', 'name description');
            
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminBooks = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};
        
        if (status === 'published') query.isPublished = true;
        if (status === 'draft') query.isPublished = false;

        const books = await Book.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Book.countDocuments(query);

        res.json({
            books,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalItems: count
        });
    } catch (error) {
        console.error('Error fetching admin books:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBook = async(req, res) => {
    try {
        const book = await Book.find();
        res.status(200).json(book);
    } catch (error) {
        console.log("Error: ", error);
        res.status(500).json(error);
    }
};