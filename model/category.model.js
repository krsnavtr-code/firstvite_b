import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: ''
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    showOnHome: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Create slug from name before saving
categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
