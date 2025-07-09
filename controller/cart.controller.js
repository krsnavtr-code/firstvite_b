import Cart from '../model/Cart.js';
import Course from '../model/course.model.js';
import { NotFoundError } from '../middleware/error.js';

// Get user's cart
const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.course', 'title price thumbnail')
    .lean();

  if (!cart) {
    return res.json({
      items: [],
      totalItems: 0,
      totalPrice: 0
    });
  }

  // Calculate totals
  const { items } = cart;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = item.course?.price || item.price;
    return sum + (itemPrice * item.quantity);
  }, 0);

  res.json({
    ...cart,
    totalItems,
    totalPrice
  });
};

// Add item to cart
const addToCart = async (req, res) => {
  const { courseId, quantity = 1 } = req.body;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // Create new cart if it doesn't exist
    cart = new Cart({
      user: req.user._id,
      items: [{
        course: course._id,
        quantity,
        price: course.price,
        title: course.title,
        image: course.thumbnail
      }]
    });
  } else {
    // Check if course already in cart
    const itemIndex = cart.items.findIndex(
      item => item.course.toString() === courseId
    );

    if (itemIndex > -1) {
      // Update quantity if course already in cart
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.items.push({
        course: course._id,
        quantity,
        price: course.price,
        title: course.title,
        image: course.thumbnail
      });
    }
  }

  await cart.save();
  
  res.status(201).json({
    success: true,
    message: 'Item added to cart',
    cart
  });
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({ message: 'Quantity must be at least 1' });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new NotFoundError('Item not found in cart');
  }

  item.quantity = quantity;
  await cart.save();

  res.json({
    success: true,
    message: 'Cart updated',
    cart
  });
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  cart.items = cart.items.filter(item => item._id.toString() !== itemId);
  await cart.save();

  res.json({
    success: true,
    message: 'Item removed from cart',
    cart
  });
};

// Clear cart
const clearCart = async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items: [], totalItems: 0, totalPrice: 0 } },
    { new: true }
  );

  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  res.json({
    success: true,
    message: 'Cart cleared',
    cart
  });
};

export {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
