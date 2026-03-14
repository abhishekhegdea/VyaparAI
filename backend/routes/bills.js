const express = require('express');
const ARIMA = require('arima');
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

function formatDayLabel(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function formatYearLabel(date) {
  return String(date.getFullYear());
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDayLabel(start)} - ${formatDayLabel(end)}`;
}

function getLocalDayKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateDateBuckets({ unit, count }) {
  const now = new Date();
  const buckets = [];

  if (unit === 'day') {
    for (let i = count - 1; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        key: getLocalDayKey(start),
        label: formatDayLabel(start),
        start,
        end
      });
    }
    return buckets;
  }

  if (unit === 'week') {
    const thisWeek = getWeekStart(now);
    for (let i = count - 1; i >= 0; i -= 1) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: formatWeekLabel(start),
        start,
        end
      });
    }
    return buckets;
  }

  if (unit === 'month') {
    for (let i = count - 1; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        label: formatMonthLabel(start),
        start,
        end
      });
    }
    return buckets;
  }

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear() - i, 0, 1);
    const end = new Date(start.getFullYear() + 1, 0, 1);
    buckets.push({
      key: String(start.getFullYear()),
      label: formatYearLabel(start),
      start,
      end
    });
  }

  return buckets;
}

function buildSalesSeries(bills, { unit, count }) {
  const buckets = generateDateBuckets({ unit, count });
  const series = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    revenue: 0,
    bills: 0,
    itemsSold: 0
  }));

  const indexByKey = new Map(series.map((entry, idx) => [entry.key, idx]));

  for (const bill of bills) {
    const created = new Date(bill.created_at);
    let key;

    if (unit === 'day') {
      key = getLocalDayKey(created);
    } else if (unit === 'week') {
      key = getLocalDayKey(getWeekStart(created));
    } else if (unit === 'month') {
      key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = String(created.getFullYear());
    }

    const idx = indexByKey.get(key);
    if (idx === undefined) {
      continue;
    }

    const items = Array.isArray(bill.items) ? bill.items : [];
    const itemsSold = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    series[idx].revenue += Number(bill.total || 0);
    series[idx].bills += 1;
    series[idx].itemsSold += itemsSold;
  }

  return series.map((entry) => ({
    ...entry,
    revenue: Number(entry.revenue.toFixed(2))
  }));
}

function buildTopSellingProducts(bills) {
  const productMap = new Map();

  for (const bill of bills) {
    const items = Array.isArray(bill.items) ? bill.items : [];

    for (const item of items) {
      const productID = Number(item.productID);
      if (!Number.isFinite(productID)) {
        continue;
      }

      if (!productMap.has(productID)) {
        productMap.set(productID, {
          productID,
          name: item.name || `Product ${productID}`,
          totalQuantity: 0,
          totalRevenue: 0,
          billsCount: 0
        });
      }

      const current = productMap.get(productID);
      current.totalQuantity += Number(item.quantity || 0);
      current.totalRevenue += Number(item.total || (Number(item.price || 0) * Number(item.quantity || 0)) || 0);
      current.billsCount += 1;
    }
  }

  return Array.from(productMap.values())
    .map((product) => ({
      ...product,
      totalRevenue: Number(product.totalRevenue.toFixed(2))
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

function buildDailyProductSeries(bills, productID, days = 90) {
  const dayMap = new Map();
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = getLocalDayKey(day);
    dayMap.set(key, {
      date: key,
      label: formatDayLabel(day),
      quantity: 0
    });
  }

  for (const bill of bills) {
    const dayKey = getLocalDayKey(bill.created_at);
    if (!dayMap.has(dayKey)) {
      continue;
    }

    const items = Array.isArray(bill.items) ? bill.items : [];
    let qty = 0;
    for (const item of items) {
      if (Number(item.productID) === Number(productID)) {
        qty += Number(item.quantity || 0);
      }
    }

    if (qty > 0) {
      dayMap.get(dayKey).quantity += qty;
    }
  }

  return Array.from(dayMap.values());
}

function runArimaForecast(series, horizon) {
  const clean = series.map((v) => Number(v || 0));
  const totalSales = clean.reduce((sum, v) => sum + v, 0);

  // Not enough data or zero-sale history — fall back to simple average
  if (clean.length < 10 || totalSales === 0) {
    const avg = clean.length ? totalSales / clean.length : 0;
    const fallback = Array.from({ length: horizon }, () => Math.max(0, Number(avg.toFixed(2))));
    return {
      method: 'fallback-average',
      values: fallback
    };
  }

  try {
    const model = new ARIMA({ p: 2, d: 1, q: 1, verbose: false }).train(clean);
    const [pred] = model.predict(horizon);
    if (typeof model.destroy === 'function') {
      model.destroy();
    }

    // Validate predictions — NaN/Infinity means the model diverged; use moving-average fallback
    const valid = pred.every((v) => Number.isFinite(v));
    if (!valid) {
      throw new Error('ARIMA produced non-finite predictions');
    }

    return {
      method: 'arima(2,1,1)',
      values: pred.map((v) => Math.max(0, Number(Number(v).toFixed(2))))
    };
  } catch (error) {
    const recent = clean.filter((v) => v > 0).slice(-14);
    const avg = recent.length ? recent.reduce((sum, v) => sum + v, 0) / recent.length : 0;
    const fallback = Array.from({ length: horizon }, () => Math.max(0, Number(avg.toFixed(2))));
    return {
      method: 'fallback-moving-average',
      values: fallback
    };
  }
}

function runSeasonalSarimaLikeForecast(series, horizon, seasonLength = 7) {
  const clean = series.map((v) => Number(v || 0));
  const n = clean.length;

  if (n < seasonLength * 2) {
    return {
      method: 'sarima-like-fallback-average',
      values: Array.from({ length: horizon }, () => {
        const avg = n ? clean.reduce((sum, v) => sum + v, 0) / n : 0;
        return Math.max(0, Number(avg.toFixed(2)));
      })
    };
  }

  // Build weekly seasonal profile by index modulo 7.
  const buckets = Array.from({ length: seasonLength }, () => []);
  clean.forEach((value, idx) => {
    buckets[idx % seasonLength].push(value);
  });

  const seasonalProfile = buckets.map((bucket) => {
    if (!bucket.length) return 0;
    return bucket.reduce((sum, v) => sum + v, 0) / bucket.length;
  });

  const seasonalMean = seasonalProfile.reduce((sum, v) => sum + v, 0) / seasonLength;

  const last7 = clean.slice(-7);
  const prev7 = clean.slice(-14, -7);
  const baseLevel = last7.reduce((sum, v) => sum + v, 0) / Math.max(last7.length, 1);
  const prevLevel = prev7.length ? prev7.reduce((sum, v) => sum + v, 0) / prev7.length : baseLevel;
  const trendPerStep = (baseLevel - prevLevel) / 7;

  const values = Array.from({ length: horizon }, (_, idx) => {
    const step = idx + 1;
    const seasonalIndex = (n + idx) % seasonLength;
    const seasonalAdj = seasonalProfile[seasonalIndex] - seasonalMean;
    const estimate = baseLevel + trendPerStep * step + seasonalAdj;
    return Math.max(0, Number(estimate.toFixed(2)));
  });

  return {
    method: 'sarima-like(weekly)',
    values
  };
}

function runHybridForecast(series, horizon) {
  const arima = runArimaForecast(series, horizon);
  const sarimaLike = runSeasonalSarimaLikeForecast(series, horizon, 7);

  const length = Math.min(arima.values.length, sarimaLike.values.length, horizon);
  const historyLength = series.length;
  const arimaWeight = historyLength >= 28 ? 0.65 : 0.75;
  const sarimaWeight = 1 - arimaWeight;

  const values = Array.from({ length }, (_, idx) => {
    const blended = arima.values[idx] * arimaWeight + sarimaLike.values[idx] * sarimaWeight;
    return Math.max(0, Number(blended.toFixed(2)));
  });

  return {
    method: `hybrid(${arima.method}+${sarimaLike.method})`,
    values,
    components: {
      arima: arima.values,
      sarimaLike: sarimaLike.values,
      weights: {
        arima: arimaWeight,
        sarimaLike: sarimaWeight
      }
    }
  };
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
      notes = '',
      sale_date
    } = req.body;

    // Allow past dates for back-entry of historical sales; default to now.
    // Bill dates feed directly into ARIMA daily demand series.
    let billDate = new Date();
    if (sale_date) {
      const parsed = new Date(sale_date);
      if (!Number.isNaN(parsed.getTime()) && parsed <= new Date()) {
        // Set to noon of that day so timezone shifts don't flip the date
        billDate = new Date(
          parsed.getFullYear(),
          parsed.getMonth(),
          parsed.getDate(),
          12, 0, 0, 0
        );
      }
    }

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
      apply_gst: !!applyGST,
      created_at: billDate
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

// Get analytics for charting sales by day/week/month/year and top selling products
router.get('/admin/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bills = await Bill.find(
      { ownerAdminID: req.user.userID },
      { _id: 0, created_at: 1, total: 1, items: 1 }
    )
      .sort({ created_at: 1 })
      .lean();

    const byDay = buildSalesSeries(bills, { unit: 'day', count: 14 });
    const byWeek = buildSalesSeries(bills, { unit: 'week', count: 12 });
    const byMonth = buildSalesSeries(bills, { unit: 'month', count: 12 });
    const byYear = buildSalesSeries(bills, { unit: 'year', count: 5 });
    const topSellingProducts = buildTopSellingProducts(bills).slice(0, 10);

    res.json({
      analytics: {
        byDay,
        byWeek,
        byMonth,
        byYear,
        topSellingProducts,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
});

// ARIMA forecast for a specific product based on past daily sales
router.get('/admin/forecast', requireAuth, requireAdmin, async (req, res) => {
  try {
    const productID = Number(req.query.productID);
    const horizonDays = clamp(Number(req.query.horizon || 14), 1, 30);

    if (!Number.isFinite(productID)) {
      return res.status(400).json({ error: 'Valid productID is required' });
    }

    const product = await Product.findOne(
      { productID, ownerAdminID: req.user.userID },
      { _id: 0, productID: 1, name: 1 }
    ).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const bills = await Bill.find(
      { ownerAdminID: req.user.userID },
      { _id: 0, created_at: 1, items: 1 }
    )
      .sort({ created_at: 1 })
      .lean();

    const historicalDaily = buildDailyProductSeries(bills, productID, 90);
    const historicalVector = historicalDaily.map((entry) => Number(entry.quantity || 0));
    const prediction = runHybridForecast(historicalVector, horizonDays);

    const start = new Date();
    const predictedDaily = prediction.values.map((value, idx) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx + 1);
      return {
        date: date.toISOString().slice(0, 10),
        label: formatDayLabel(date),
        predictedQuantity: Math.max(0, Math.round(value))
      };
    });

    const combinedSeries = [
      ...historicalDaily.map((entry) => ({
        ...entry,
        actualQuantity: entry.quantity,
        predictedQuantity: null
      })),
      ...predictedDaily.map((entry) => ({
        ...entry,
        actualQuantity: null
      }))
    ];

    const suggestedStock = predictedDaily.reduce((sum, point) => sum + point.predictedQuantity, 0);

    res.json({
      forecast: {
        productID,
        productName: product.name,
        horizonDays,
        method: prediction.method,
        suggestedStock,
        historicalDaily,
        predictedDaily,
        combinedSeries
      }
    });
  } catch (error) {
    console.error('Get product forecast error:', error);
    res.status(500).json({ error: 'Failed to forecast product demand' });
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