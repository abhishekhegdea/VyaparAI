require('dotenv').config();
const mongoose = require('mongoose');
const { initDatabase, models, helpers } = require('../database/database');

async function main() {
  const sourceEmail = process.argv[2] || 'admin@vyaparai.com';
  const targetEmail = process.argv[3] || 'abhishekhegdea@gmail.com';
  const replaceMode = (process.argv[4] || 'replace').toLowerCase() === 'replace';

  await initDatabase();

  const { User, Product, Bill } = models;

  const source = await User.findOne({ email: sourceEmail, role: 'admin' }, { _id: 0, userID: 1, email: 1 }).lean();
  const target = await User.findOne({ email: targetEmail, role: 'admin' }, { _id: 0, userID: 1, email: 1 }).lean();

  if (!source) throw new Error(`Source admin not found: ${sourceEmail}`);
  if (!target) throw new Error(`Target admin not found: ${targetEmail}`);
  if (source.userID === target.userID) throw new Error('Source and target are the same account.');

  const sourceProducts = await Product.find({ ownerAdminID: source.userID }, { _id: 0 }).lean();
  const sourceBills = await Bill.find({ ownerAdminID: source.userID }, { _id: 0 }).sort({ created_at: 1 }).lean();

  if (replaceMode) {
    await Bill.deleteMany({ ownerAdminID: target.userID });
    await Product.deleteMany({ ownerAdminID: target.userID });
  }

  const productIdMap = new Map();

  for (const srcProduct of sourceProducts) {
    const createdProduct = await helpers.createProduct({
      ownerAdminID: target.userID,
      name: srcProduct.name,
      category: srcProduct.category,
      description: srcProduct.description || '',
      price: Number(srcProduct.price || 0),
      GST_applicable: !!srcProduct.GST_applicable,
      quantity: Number(srcProduct.quantity || 0),
      expiry_date: srcProduct.expiry_date || null,
      image_url: srcProduct.image_url || null,
      image_public_id: srcProduct.image_public_id || null,
      created_at: srcProduct.created_at || new Date()
    });

    const targetProduct = createdProduct.toObject ? createdProduct.toObject() : createdProduct;
    productIdMap.set(Number(srcProduct.productID), Number(targetProduct.productID));
  }

  let migratedBills = 0;
  for (const srcBill of sourceBills) {
    const srcItems = Array.isArray(srcBill.items) ? srcBill.items : [];
    const targetItems = srcItems
      .map((item) => {
        const mappedProductID = productIdMap.get(Number(item.productID));
        if (!mappedProductID) return null;

        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const total = Number(item.total || price * quantity || 0);

        return {
          productID: mappedProductID,
          name: item.name,
          category: item.category,
          price,
          quantity,
          total,
          GST_applicable: !!item.GST_applicable,
          GST_amount: Number(item.GST_amount || 0)
        };
      })
      .filter(Boolean);

    if (!targetItems.length) {
      continue;
    }

    const subtotal = Number(srcBill.subtotal || targetItems.reduce((s, x) => s + Number(x.total || 0), 0));
    const gstAmount = Number(srcBill.GST_amount || 0);
    const total = Number(srcBill.total || subtotal + gstAmount);

    await helpers.createBill({
      ownerAdminID: target.userID,
      userID: null,
      items: targetItems,
      subtotal,
      GST_amount: gstAmount,
      total,
      bill_type: srcBill.bill_type || 'admin',
      customer_name: srcBill.customer_name || 'Walk-in Customer',
      customer_phone: srcBill.customer_phone || null,
      customer_email: srcBill.customer_email || null,
      payment_method: srcBill.payment_method || 'cash',
      notes: srcBill.notes || null,
      apply_gst: srcBill.apply_gst !== false,
      created_at: srcBill.created_at || new Date()
    });

    migratedBills += 1;
  }

  const finalProducts = await Product.countDocuments({ ownerAdminID: target.userID });
  const finalBills = await Bill.countDocuments({ ownerAdminID: target.userID });

  console.log('OWNER_DATA_MIGRATION_OK');
  console.log(`SOURCE=${source.email} (${source.userID})`);
  console.log(`TARGET=${target.email} (${target.userID})`);
  console.log(`MIGRATED_PRODUCTS=${sourceProducts.length}`);
  console.log(`MIGRATED_BILLS=${migratedBills}`);
  console.log(`TARGET_PRODUCTS_TOTAL=${finalProducts}`);
  console.log(`TARGET_BILLS_TOTAL=${finalBills}`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('MIGRATION_FAILED', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
