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

        // Create new user - the pre-save hook will hash the password
        const newUser = new User({
            fullname,
            email,
            password: password, // The pre-save hook will hash this
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
        
        // Input validation
        if (!email || !password) {
            console.log('Login attempt with missing credentials');
            return res.status(400).json({ 
                success: false,
                message: 'Please provide both email and password' 
            });
        }

        console.log(`Login attempt for email: ${email}`);
        
        // Find user by email and include password field
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('No user found with email:', email);
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Check password using bcrypt
        const isMatch = await bcryptjs.compare(password, user.password);
        
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role || 'student' // Changed default role to match our schema
            },
            process.env.JWT_SECRET || 'your_jwt_secret', // Fallback secret for development
            { 
                expiresIn: process.env.JWT_EXPIRES_IN || '1d' 
            }
        );

        console.log('Login successful for user:', user.email);
        
        // Set cookie with token
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Prepare user data for response (exclude password)
        const userData = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            role: user.role || 'student',
            department: user.department
        };

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            user: userData
        });
    } catch (error) {
        console.log("Error: " + error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};