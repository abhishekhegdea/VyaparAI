const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { initDatabase, models, helpers } = require('../database/database');

const GST_RATE = 0.18;

const CATEGORY_BY_PRODUCT = {
  Pens: 'Stationaries',
  Notebooks: 'Stationaries',
  Pencils: 'Stationaries',
  Markers: 'Stationaries',
  Erasers: 'Stationaries',
  Staplers: 'Stationaries',
  Files: 'Stationaries',
  Highlighters: 'Stationaries'
};

function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const values = raw.split(',').map((v) => v.trim());
    if (values.length !== headers.length) continue;

    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = values[j];
    }
    records.push(row);
  }

  return records;
}

function groupByBillId(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = Number(row.bill_id);
    if (!grouped.has(key)) {
      grouped.set(key, {
        bill_id: key,
        date: row.date,
        lines: []
      });
    }
    grouped.get(key).lines.push(row);
  }

  return Array.from(grouped.values()).sort((a, b) => a.bill_id - b.bill_id);
}

async function main() {
  const csvPathArg = process.argv[2];
  const adminEmail = process.argv[3] || 'admin@dukaansaathi.com';
  const csvPath = csvPathArg
    ? path.resolve(csvPathArg)
    : path.resolve(__dirname, '../../analytics/synthetic_billing_data.csv');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }

  await initDatabase();

  const { User, Product, Bill } = models;

  const admin = await User.findOne({ email: adminEmail, role: 'admin' }, { _id: 0 }).lean();
  if (!admin) {
    throw new Error(`Admin not found: ${adminEmail}`);
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(rawCsv);
  if (!rows.length) {
    throw new Error('CSV has no rows to import.');
  }

  // Keep reruns clean by deleting only synthetic seed bills.
  const removed = await Bill.deleteMany({ ownerAdminID: admin.userID, notes: 'synthetic-arima-seed' });

  // Ensure all products from CSV exist for this admin.
  const neededProducts = new Map();
  for (const row of rows) {
    const name = String(row.product_name || '').trim();
    const price = Number(row.price_per_unit || 0);
    if (!name || !Number.isFinite(price)) continue;
    if (!neededProducts.has(name)) {
      neededProducts.set(name, price);
    }
  }

  const productByName = new Map();
  for (const [name, price] of neededProducts.entries()) {
    let product = await Product.findOne(
      { ownerAdminID: admin.userID, name },
      { _id: 0 }
    ).lean();

    if (!product) {
      const created = await helpers.createProduct({
        ownerAdminID: admin.userID,
        name,
        category: CATEGORY_BY_PRODUCT[name] || 'Stationaries',
        description: `${name} (synthetic demand seed item)`,
        price,
        GST_applicable: price >= 18,
        quantity: 500
      });
      product = created.toObject ? created.toObject() : created;
    }

    productByName.set(name, product);
  }

  const billGroups = groupByBillId(rows);

  let insertedBills = 0;
  let insertedLineItems = 0;

  for (const group of billGroups) {
    const items = [];

    for (const line of group.lines) {
      const productName = String(line.product_name || '').trim();
      const product = productByName.get(productName);
      if (!product) continue;

      const quantity = Number(line.quantity || 0);
      const price = Number(line.price_per_unit || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      if (!Number.isFinite(price) || price <= 0) continue;

      const lineTotal = Number(line.total_amount || quantity * price);
      const gstApplicable = !!product.GST_applicable;

      items.push({
        productID: Number(product.productID),
        name: product.name,
        category: product.category,
        price,
        quantity,
        total: lineTotal,
        GST_applicable: gstApplicable,
        GST_amount: gstApplicable ? Number((lineTotal * GST_RATE).toFixed(2)) : 0
      });
    }

    if (!items.length) continue;

    const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const saleDate = new Date(`${group.date}T12:00:00`);

    await helpers.createBill({
      ownerAdminID: admin.userID,
      userID: null,
      items,
      subtotal,
      GST_amount: 0,
      total: subtotal,
      bill_type: 'admin',
      customer_name: 'Synthetic Customer',
      customer_phone: null,
      customer_email: null,
      payment_method: 'cash',
      notes: 'synthetic-arima-seed',
      apply_gst: false,
      created_at: saleDate
    });

    insertedBills += 1;
    insertedLineItems += items.length;
  }

  console.log('Synthetic billing import complete.');
  console.log(`Admin email: ${adminEmail}`);
  console.log(`CSV path: ${csvPath}`);
  console.log(`Removed old synthetic bills: ${removed.deletedCount || 0}`);
  console.log(`Imported bills: ${insertedBills}`);
  console.log(`Imported line items: ${insertedLineItems}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exit(1);
  });
