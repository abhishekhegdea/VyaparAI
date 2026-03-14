const express = require('express');
const multer = require('multer');
const path = require('path');
const { models, helpers } = require('../database/database');
const { requireAuth, requireAdmin } = require('./middleware');
const { buildMarketingAdvice } = require('../services/agenticAdvisors');
const { uploadProductImage, persistMarketingAdviceImage, removeStoredImage } = require('../services/imageStorage');

const router = express.Router();
const { Product } = models;

function isConsumableCategory(category) {
  const normalized = String(category || '').trim().toLowerCase();
  return normalized.includes('food') || normalized.includes('beverage');
}

function parseExpiryDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Retail manager app: all product access is admin-authenticated.
router.use(requireAuth, requireAdmin);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all products (public access)
router.get('/', async (req, res) => {
  try {
    const { category, search, includeOutOfStock } = req.query;
    const shouldIncludeOutOfStock = String(includeOutOfStock).toLowerCase() === 'true';
    const filter = shouldIncludeOutOfStock
      ? { ownerAdminID: req.user.userID }
      : { ownerAdminID: req.user.userID, quantity: { $gt: 0 } };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const products = await Product.find(filter, { _id: 0 }).sort({ created_at: -1 }).lean();
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product categories (public access)
router.get('/categories/list', async (req, res) => {
  try {
    const { includeOutOfStock } = req.query;
    const shouldIncludeOutOfStock = String(includeOutOfStock).toLowerCase() === 'true';
    const categoryFilter = shouldIncludeOutOfStock
      ? { ownerAdminID: req.user.userID }
      : { ownerAdminID: req.user.userID, quantity: { $gt: 0 } };
    const categories = await Product.distinct('category', categoryFilter);
    categories.sort((a, b) => a.localeCompare(b));
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get product by ID (public access)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne(
      { productID: Number(req.params.id), ownerAdminID: req.user.userID },
      { _id: 0 }
    ).lean();
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Add new product (admin only)
router.post('/', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, description, price, GST_applicable, quantity, expiry_date } = req.body;

    if (!name || !category || !price || quantity === undefined) {
      return res.status(400).json({ error: 'Name, category, price, and quantity are required' });
    }

    const parsedExpiryDate = parseExpiryDate(expiry_date);
    if (isConsumableCategory(category) && !parsedExpiryDate) {
      return res.status(400).json({ error: 'Expiry date is required for Food/Beverages products' });
    }

    const uploadedImage = await uploadProductImage(req.file, {
      folder: 'vyaparai/products',
      baseName: name
    });

    const newProductDoc = await helpers.createProduct({
      ownerAdminID: req.user.userID,
      name,
      category,
      description: description || '',
      price: parseFloat(price),
      GST_applicable: GST_applicable === 'true' || GST_applicable === true,
      quantity: parseInt(quantity, 10),
      expiry_date: parsedExpiryDate,
      image_url: uploadedImage.imageUrl,
      image_public_id: uploadedImage.publicId
    });

    const newProduct = newProductDoc.toObject();
    delete newProduct._id;
    const marketingAgent = await persistMarketingAdviceImage(buildMarketingAdvice(newProduct));

    res.status(201).json({
      message: 'Product added successfully',
      product: newProduct,
      marketingAgent
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product (admin only)
router.put('/:id', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, description, price, GST_applicable, quantity, expiry_date } = req.body;
    const productId = req.params.id;

    // Check if product exists
    const existingProduct = await Product.findOne({
      productID: Number(productId),
      ownerAdminID: req.user.userID
    });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let image_url = existingProduct.image_url;
    let image_public_id = existingProduct.image_public_id || null;

    if (req.file) {
      const uploadedImage = await uploadProductImage(req.file, {
        folder: 'vyaparai/products',
        baseName: name || existingProduct.name
      });
      image_url = uploadedImage.imageUrl;
      image_public_id = uploadedImage.publicId;
      await removeStoredImage(existingProduct.image_public_id);
    }

    const parsedPrice = price !== undefined ? parseFloat(price) : existingProduct.price;
    const parsedQuantity = quantity !== undefined ? parseInt(quantity, 10) : existingProduct.quantity;
    const parsedGST = GST_applicable !== undefined
      ? GST_applicable === 'true' || GST_applicable === true
      : existingProduct.GST_applicable;
    const resolvedCategory = category || existingProduct.category;
    const parsedExpiryDate = expiry_date !== undefined
      ? parseExpiryDate(expiry_date)
      : existingProduct.expiry_date;

    if (isConsumableCategory(resolvedCategory) && !parsedExpiryDate) {
      return res.status(400).json({ error: 'Expiry date is required for Food/Beverages products' });
    }

    existingProduct.name = name || existingProduct.name;
    existingProduct.category = resolvedCategory;
    existingProduct.description = description !== undefined ? description : existingProduct.description;
    existingProduct.price = Number.isNaN(parsedPrice) ? existingProduct.price : parsedPrice;
    existingProduct.GST_applicable = parsedGST;
    existingProduct.quantity = Number.isNaN(parsedQuantity) ? existingProduct.quantity : parsedQuantity;
    existingProduct.expiry_date = parsedExpiryDate;
    existingProduct.image_url = image_url;
    existingProduct.image_public_id = image_public_id;

    await existingProduct.save();

    const updatedProduct = existingProduct.toObject();
    delete updatedProduct._id;

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists
    const existingProduct = await Product.findOne({
      productID: Number(productId),
      ownerAdminID: req.user.userID
    }).lean();
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await removeStoredImage(existingProduct.image_public_id);
    await Product.deleteOne({ productID: Number(productId), ownerAdminID: req.user.userID });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update product quantity (admin only)
router.patch('/:id/quantity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.id;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const existingProduct = await Product.findOne({
      productID: Number(productId),
      ownerAdminID: req.user.userID
    });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    existingProduct.quantity = parseInt(quantity, 10);
    await existingProduct.save();

    const updatedProduct = existingProduct.toObject();
    delete updatedProduct._id;

    res.json({
      message: 'Product quantity updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ error: 'Failed to update product quantity' });
  }
});

module.exports = router; 