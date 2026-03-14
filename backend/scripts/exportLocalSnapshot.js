const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { initDatabase, models } = require('../database/database');

function toPlain(value) {
  if (!value) return value;
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const adminEmail = process.argv[2] || 'abhishekhegdea@gmail.com';
  const outPathArg = process.argv[3];
  const outPath = outPathArg
    ? path.resolve(outPathArg)
    : path.resolve(__dirname, '../../data/localhost-measurements.json');

  await initDatabase();

  const { User, Product, Bill } = models;

  const admin = await User.findOne(
    { email: adminEmail, role: 'admin' },
    { _id: 0, userID: 1, name: 1, email: 1, role: 1, created_at: 1 }
  ).lean();

  if (!admin) {
    throw new Error(`Admin not found: ${adminEmail}`);
  }

  const products = await Product.find(
    { ownerAdminID: admin.userID },
    {
      _id: 0,
      productID: 1,
      ownerAdminID: 1,
      name: 1,
      category: 1,
      description: 1,
      price: 1,
      GST_applicable: 1,
      quantity: 1,
      expiry_date: 1,
      image_url: 1,
      image_public_id: 1,
      created_at: 1
    }
  )
    .sort({ productID: 1 })
    .lean();

  const bills = await Bill.find(
    { ownerAdminID: admin.userID },
    {
      _id: 0,
      billID: 1,
      ownerAdminID: 1,
      userID: 1,
      items: 1,
      subtotal: 1,
      GST_amount: 1,
      total: 1,
      bill_type: 1,
      customer_name: 1,
      customer_phone: 1,
      customer_email: 1,
      payment_method: 1,
      notes: 1,
      apply_gst: 1,
      created_at: 1
    }
  )
    .sort({ billID: 1 })
    .lean();

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      admin: toPlain(admin),
      productCount: products.length,
      billCount: bills.length
    },
    products: toPlain(products),
    bills: toPlain(bills)
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log('LOCALHOST_SNAPSHOT_EXPORTED');
  console.log(`ADMIN_EMAIL=${admin.email}`);
  console.log(`PRODUCTS=${products.length}`);
  console.log(`BILLS=${bills.length}`);
  console.log(`OUT_PATH=${outPath}`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('EXPORT_FAILED', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
