import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controller/cart.controller.js';

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// GET /api/cart - Get user's cart
router.get('/', getCart);

// POST /api/cart - Add item to cart
router.post('/', addToCart);

// PUT /api/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId', updateCartItem);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', removeFromCart);

// DELETE /api/cart - Clear cart
router.delete('/', clearCart);

export default router;
