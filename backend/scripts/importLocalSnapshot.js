const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { initDatabase, models, helpers } = require('../database/database');

async function ensureAdminByEmail(email, fallbackName) {
  const { User } = models;
  let admin = await User.findOne({ email, role: 'admin' });

  if (admin) {
    return admin;
  }

  const password = process.env.LOCALHOST_IMPORT_ADMIN_PASSWORD || 'admin123';
  const hashed = await bcrypt.hash(password, 10);
  admin = await helpers.createUser({
    name: fallbackName || 'Imported Admin',
    email,
    password: hashed,
    role: 'admin'
  });

  return admin;
}

function readSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotPath}`);
  }

  const raw = fs.readFileSync(snapshotPath, 'utf8');
  const payload = JSON.parse(raw);

  if (!payload || !Array.isArray(payload.products) || !Array.isArray(payload.bills)) {
    throw new Error('Invalid snapshot file format.');
  }

  return payload;
}

async function main() {
  const snapshotPathArg = process.argv[2];
  const targetAdminEmailArg = process.argv[3];

  const snapshotPath = snapshotPathArg
    ? path.resolve(snapshotPathArg)
    : path.resolve(__dirname, '../../data/localhost-measurements.json');

  const snapshot = readSnapshot(snapshotPath);
  const sourceAdmin = snapshot.source && snapshot.source.admin ? snapshot.source.admin : null;

  const targetAdminEmail = targetAdminEmailArg || (sourceAdmin ? sourceAdmin.email : null);
  if (!targetAdminEmail) {
    throw new Error('Target admin email is required. Pass it as second argument.');
  }

  await initDatabase();

  const { Product, Bill } = models;
  const targetAdmin = await ensureAdminByEmail(targetAdminEmail, sourceAdmin && sourceAdmin.name);
  const targetAdminID = targetAdmin.userID;

  // Replace only this admin's business data so reruns are deterministic.
  await Product.deleteMany({ ownerAdminID: targetAdminID });
  await Bill.deleteMany({ ownerAdminID: targetAdminID });

  const productIdMap = new Map();

  for (const product of snapshot.products) {
    const created = await helpers.createProduct({
      ownerAdminID: targetAdminID,
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: Number(product.price || 0),
      GST_applicable: !!product.GST_applicable,
      quantity: Number(product.quantity || 0),
      expiry_date: product.expiry_date || null,
      image_url: product.image_url || null,
      image_public_id: product.image_public_id || null,
      created_at: product.created_at || new Date()
    });

    const newProduct = created.toObject ? created.toObject() : created;
    productIdMap.set(Number(product.productID), Number(newProduct.productID));
  }

  let importedBills = 0;
  for (const bill of snapshot.bills) {
    const remappedItems = Array.isArray(bill.items)
      ? bill.items.map((item) => ({
          ...item,
          productID: productIdMap.get(Number(item.productID)) || Number(item.productID)
        }))
      : [];

    await helpers.createBill({
      ownerAdminID: targetAdminID,
      userID: bill.userID || null,
      items: remappedItems,
      subtotal: Number(bill.subtotal || 0),
      GST_amount: Number(bill.GST_amount || 0),
      total: Number(bill.total || 0),
      bill_type: bill.bill_type || 'admin',
      customer_name: bill.customer_name || null,
      customer_phone: bill.customer_phone || null,
      customer_email: bill.customer_email || null,
      payment_method: bill.payment_method || 'cash',
      notes: bill.notes || null,
      apply_gst: typeof bill.apply_gst === 'boolean' ? bill.apply_gst : true,
      created_at: bill.created_at || new Date()
    });

    importedBills += 1;
  }

  console.log('LOCALHOST_SNAPSHOT_IMPORTED');
  console.log(`TARGET_ADMIN_EMAIL=${targetAdminEmail}`);
  console.log(`IMPORTED_PRODUCTS=${snapshot.products.length}`);
  console.log(`IMPORTED_BILLS=${importedBills}`);
  console.log(`SNAPSHOT_PATH=${snapshotPath}`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('IMPORT_FAILED', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
