const express = require('express');
const { models, helpers } = require('../database/database');
const { requireAuth, requireAdmin } = require('./middleware');

const router = express.Router();
const { Bill, Product, User } = models;

// Retail manager app: all billing endpoints are admin-authenticated.
router.use(requireAuth, requireAdmin);

async function getProductsByIDs(productIDs, ownerAdminID) {
  const uniqueIDs = [...new Set(productIDs.map((id) => Number(id)))];
  const products = await Product.find(
    { productID: { $in: uniqueIDs }, ownerAdminID },
    { _id: 0 }
  ).lean();
  return new Map(products.map((product) => [product.productID, product]));
}

// Generate admin bill (with GST breakdown)
router.post('/admin/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      items, 
      customerName, 
      customerPhone, 
      customerEmail, 
      applyGST = true, 
      paymentMethod = 'cash',
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Validate items and stock
    const billItems = [];
    let subtotal = 0;
    let gstAmount = 0;
    const GST_RATE = 0.18; // 18%

    const productMap = await getProductsByIDs(items.map((item) => item.productID), req.user.userID);

    for (const item of items) {
      const product = productMap.get(Number(item.productID));
      
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.productID} not found` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.quantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      const itemGST = (applyGST && product.GST_applicable) ? itemTotal * GST_RATE : 0;

      subtotal += itemTotal;
      gstAmount += itemGST;

      billItems.push({
        productID: product.productID,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        GST_applicable: product.GST_applicable,
        GST_amount: itemGST
      });
    }

    const total = subtotal + gstAmount;

    // Create bill record with enhanced fields
    const bill = await helpers.createBill({
      ownerAdminID: req.user.userID,
      userID: null,
      items: billItems,
      subtotal,
      GST_amount: gstAmount,
      total,
      bill_type: 'admin',
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      payment_method: paymentMethod,
      notes: notes || null,
      apply_gst: !!applyGST
    });

    // Update product quantities (reduce stock)
    for (const item of items) {
      await Product.updateOne(
        { productID: Number(item.productID), ownerAdminID: req.user.userID },
        { $inc: { quantity: -Number(item.quantity) } }
      );
    }

    const billPayload = bill.toObject();
    delete billPayload._id;

    res.status(201).json({
      message: 'Admin bill generated successfully',
      bill: {
        ...billPayload,
        items: billPayload.items || [],
        customerName: billPayload.customer_name,
        customerPhone: billPayload.customer_phone,
        customerEmail: billPayload.customer_email,
        paymentMethod: billPayload.payment_method,
        notes: billPayload.notes,
        applyGST: billPayload.apply_gst
      },
      breakdown: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        gstRate: GST_RATE * 100 + '%',
        applyGST
      }
    });
  } catch (error) {
    console.error('Generate admin bill error:', error);
    res.status(500).json({ error: 'Failed to generate admin bill' });
  }
});

// Get all bills (admin only)
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bills = await Bill.find({ ownerAdminID: req.user.userID }, { _id: 0 }).sort({ created_at: -1 }).lean();
    const userIDs = bills.filter((bill) => bill.userID !== null).map((bill) => bill.userID);
    const users = await User.find({ userID: { $in: userIDs } }, { _id: 0, userID: 1, name: 1 }).lean();
    const userNameByID = new Map(users.map((user) => [user.userID, user.name]));

    // Parse items JSON for each bill and format response
    const billsWithItems = bills.map(bill => ({
      ...bill,
      items: bill.items || [],
      customerName: bill.customer_name || userNameByID.get(bill.userID) || 'Walk-in Customer',
      customerPhone: bill.customer_phone,
      customerEmail: bill.customer_email,
      paymentMethod: bill.payment_method || 'cash',
      notes: bill.notes,
      applyGST: bill.apply_gst === true || bill.apply_gst === null
    }));

    res.json({ bills: billsWithItems });
  } catch (error) {
    console.error('Get admin bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// GET statistics for admin dashboard
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const revenueAgg = await Bill.aggregate([
      { $match: { ownerAdminID: req.user.userID } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalProducts = await Product.countDocuments({ ownerAdminID: req.user.userID });
    const totalUsers = await Bill.distinct('customer_email', {
      ownerAdminID: req.user.userID,
      customer_email: { $nin: [null, ''] }
    }).then((emails) => emails.length);
    
    res.json({
      totalRevenue: (revenueAgg[0] && revenueAgg[0].total) || 0,
      totalProducts,
      totalUsers,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get billing statistics (admin only)
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const statsAgg = await Bill.aggregate([
      {
        $match: {
          ownerAdminID: req.user.userID
        }
      },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalGST: { $sum: '$GST_amount' },
          userBills: {
            $sum: {
              $cond: [{ $eq: ['$bill_type', 'user'] }, 1, 0]
            }
          },
          adminBills: {
            $sum: {
              $cond: [{ $eq: ['$bill_type', 'admin'] }, 1, 0]
            }
          }
        }
      }
    ]);
    const stats = statsAgg[0] || {};

    res.json({
      stats: {
        totalBills: stats.totalBills || 0,
        totalRevenue: parseFloat((stats.totalRevenue || 0).toFixed(2)),
        totalGST: parseFloat((stats.totalGST || 0).toFixed(2)),
        userBills: stats.userBills || 0,
        adminBills: stats.adminBills || 0
      }
    });
  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({ error: 'Failed to fetch billing statistics' });
  }
});

// Get bill by ID
router.get('/:billID', requireAuth, async (req, res) => {
  try {
    const { billID } = req.params;
    let bill;

    bill = await Bill.findOne({ billID: Number(billID), ownerAdminID: req.user.userID }, { _id: 0 }).lean();
    if (bill && bill.userID) {
      const user = await User.findOne({ userID: bill.userID }, { _id: 0, name: 1 }).lean();
      bill.customer_name = bill.customer_name || (user && user.name) || null;
    }

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    bill.items = bill.items || [];
    res.json({ bill });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// GET all bills (admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    let bills = await Bill.find({ ownerAdminID: req.user.userID }, { _id: 0 }).sort({ created_at: -1 }).lean();
    const userIDs = bills.filter((bill) => bill.userID !== null).map((bill) => bill.userID);
    const users = await User.find({ userID: { $in: userIDs } }, { _id: 0, userID: 1, name: 1 }).lean();
    const userNameByID = new Map(users.map((user) => [user.userID, user.name]));
    bills = bills.map((bill) => ({ ...bill, customer_name: bill.customer_name || userNameByID.get(bill.userID) || null }));

    const billsWithItems = bills.map(bill => ({ ...bill, items: bill.items || [] }));
    res.json({ bills: billsWithItems });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 