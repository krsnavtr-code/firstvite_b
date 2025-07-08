import User from "../model/User.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
export const signup = async(req, res) => {
    try {
        const { fullname, email, password, department } = req.body;
        
        // Validate required fields for student role
        if (!department) {
            return res.status(400).json({
                success: false,
                message: 'Department is required for student registration'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "User already exists" 
            });
        }

        // Hash password
        const hashPassword = await bcryptjs.hash(password, 10);
        
        // Create new user
        const newUser = new User({
            fullname,
            email,
            password: hashPassword,
            role: 'student', // Default role
            department
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // Set cookie with token
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Return success response with user data and token
        res.status(201).json({
            success: true,
            token: token,
            user: {
                _id: newUser._id,
                fullname: newUser.fullname,
                email: newUser.email,
                role: newUser.role
            },
            message: "User registered successfully"
        });
    } catch (error) {
        console.log("Error: " + error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        // First check if user exists
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Then check password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // Set cookie with token
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({
            success: true,
            token: token,
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                role: user.role || 'user'
            },
            message: "Login successful"
        });
    } catch (error) {
        console.log("Error: " + error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};