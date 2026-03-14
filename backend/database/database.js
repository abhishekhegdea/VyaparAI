const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function hasPlaceholder(value) {
  if (!value) {
    return false;
  }

  return value.includes('<') || value.includes('>');
}

function buildMongoUri() {
  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const cluster = process.env.MONGODB_CLUSTER;

  if (rawUri && !hasPlaceholder(rawUri)) {
    return rawUri;
  }

  if (rawUri && hasPlaceholder(rawUri)) {
    if (!password || hasPlaceholder(password)) {
      throw new Error('MONGODB_URI contains placeholders. Set MONGODB_PASSWORD with your real Atlas DB password.');
    }

    const encodedPassword = encodeURIComponent(password);
    return rawUri
      .replace('<db_password_encoded>', encodedPassword)
      .replace('<db_password>', encodedPassword)
      .replace('<password>', encodedPassword);
  }

  if (username && password && cluster) {
    const encodedPassword = encodeURIComponent(password);
    return `mongodb+srv://${username}:${encodedPassword}@${cluster}/?retryWrites=true&w=majority&appName=Cluster0`;
  }

  throw new Error('MongoDB config missing. Set MONGODB_URI or MONGODB_USERNAME/MONGODB_PASSWORD/MONGODB_CLUSTER in backend/.env');
}

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

const userSchema = new mongoose.Schema(
  {
    userID: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const productSchema = new mongoose.Schema(
  {
    productID: { type: Number, unique: true, index: true },
    ownerAdminID: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    GST_applicable: { type: Boolean, default: false },
    quantity: { type: Number, default: 0 },
    expiry_date: { type: Date, default: null },
    image_url: { type: String, default: null },
    image_public_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const cartSchema = new mongoose.Schema(
  {
    cartID: { type: Number, unique: true, index: true },
    userID: { type: Number, required: true, index: true },
    productID: { type: Number, required: true, index: true },
    quantity: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const billSchema = new mongoose.Schema(
  {
    billID: { type: Number, unique: true, index: true },
    ownerAdminID: { type: Number, required: true, index: true },
    userID: { type: Number, default: null, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], required: true },
    subtotal: { type: Number, required: true },
    GST_amount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    bill_type: { type: String, default: 'user', enum: ['user', 'admin'] },
    customer_name: { type: String, default: null },
    customer_phone: { type: String, default: null },
    customer_email: { type: String, default: null },
    payment_method: { type: String, default: 'cash' },
    notes: { type: String, default: null },
    apply_gst: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return counter.seq;
}

async function createUser(payload) {
  const userID = await getNextSequence('userID');
  const user = await User.create({ ...payload, userID });
  return user;
}

async function createProduct(payload) {
  const productID = await getNextSequence('productID');
  const product = await Product.create({ ...payload, productID });
  return product;
}

async function createCartItem(payload) {
  const cartID = await getNextSequence('cartID');
  const cartItem = await Cart.create({ ...payload, cartID });
  return cartItem;
}

async function createBill(payload) {
  const billID = await getNextSequence('billID');
  const bill = await Bill.create({ ...payload, billID });
  return bill;
}

async function seedDefaultAdmin() {
  const existingAdmin = await User.findOne({
    $or: [
      { email: { $regex: '^admin@dukaansaathi\\.com$', $options: 'i' } },
      { email: { $regex: '^admin@vyaparai\\.com$', $options: 'i' } }
    ]
  }).lean();
  if (existingAdmin) {
    const normalizedExistingEmail = String(existingAdmin.email || '').toLowerCase();
    if (normalizedExistingEmail !== existingAdmin.email) {
      await User.updateOne({ userID: existingAdmin.userID }, { $set: { email: normalizedExistingEmail } });
      existingAdmin.email = normalizedExistingEmail;
    }
    return existingAdmin;
  }

  const defaultAdminPassword = await bcrypt.hash('admin123', 10);
  const createdAdmin = await createUser({
    name: 'Admin',
    email: 'admin@dukaansaathi.com',
    password: defaultAdminPassword,
    role: 'admin'
  });

  console.log('Default admin user created: admin@dukaansaathi.com / admin123');
  return createdAdmin.toObject ? createdAdmin.toObject() : createdAdmin;
}

async function seedSampleProducts(ownerAdminID) {
  const sampleProducts = [
    { name: 'Pencil Set', category: 'Stationaries', description: 'Colorful pencil set with 12 pencils', price: 50.0, GST_applicable: false, quantity: 100 },
    { name: 'Notebook', category: 'Stationaries', description: 'A4 size notebook with 100 pages', price: 80.0, GST_applicable: false, quantity: 50 },
    { name: 'Blue Ball Pen Pack', category: 'Stationaries', description: 'Pack of 10 smooth-writing blue pens', price: 120.0, GST_applicable: false, quantity: 80 },
    { name: 'Marker Set', category: 'Stationaries', description: 'Permanent marker set, assorted colors', price: 95.0, GST_applicable: false, quantity: 45 },
    { name: 'Geometry Box', category: 'Stationaries', description: 'Compass, divider and ruler kit for students', price: 140.0, GST_applicable: false, quantity: 40 },
    { name: 'Teddy Bear', category: 'Toys', description: 'Soft plush teddy bear', price: 200.0, GST_applicable: true, quantity: 30 },
    { name: 'Remote Car', category: 'Toys', description: 'Battery operated remote control car', price: 500.0, GST_applicable: true, quantity: 20 },
    { name: 'Building Blocks Set', category: 'Toys', description: 'Creative 120-piece building block toy set', price: 650.0, GST_applicable: true, quantity: 18 },
    { name: 'Puzzle Board Game', category: 'Toys', description: 'Family-friendly 500-piece puzzle board game', price: 320.0, GST_applicable: true, quantity: 22 },
    { name: 'Gift Box', category: 'Gifts', description: 'Beautiful gift wrapping box', price: 150.0, GST_applicable: true, quantity: 40 },
    { name: 'Greeting Card Combo', category: 'Gifts', description: 'Set of 6 premium greeting cards', price: 180.0, GST_applicable: true, quantity: 35 },
    { name: 'Ribbon Roll Set', category: 'Gifts', description: 'Decorative ribbon rolls for gift wrapping', price: 110.0, GST_applicable: true, quantity: 55 },
    { name: 'Flower Vase', category: 'Fancy Items', description: 'Decorative ceramic flower vase', price: 300.0, GST_applicable: true, quantity: 25 },
    { name: 'Candle Holder', category: 'Fancy Items', description: 'Elegant metal candle holder', price: 180.0, GST_applicable: true, quantity: 35 },
    { name: 'Decor String Lights', category: 'Fancy Items', description: 'Warm LED string lights for decoration', price: 260.0, GST_applicable: true, quantity: 30 },
    { name: 'Birthday Card', category: 'Gifts', description: 'Handmade birthday greeting card', price: 30.0, GST_applicable: false, quantity: 100 },
    { name: 'Orange Juice 1L', category: 'Beverages', description: 'Packed orange juice bottle', price: 120.0, GST_applicable: true, quantity: 28, expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { name: 'Mixed Fruit Juice 1L', category: 'Beverages', description: 'Mixed fruit drink, 1 liter pack', price: 130.0, GST_applicable: true, quantity: 24, expiry_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) },
    { name: 'Whole Wheat Bread', category: 'Food', description: 'Fresh bakery bread loaf', price: 45.0, GST_applicable: false, quantity: 18, expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { name: 'Chocolate Cookies Pack', category: 'Food', description: 'Crunchy chocolate cookies, family pack', price: 90.0, GST_applicable: false, quantity: 40, expiry_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) }
  ];

  const existing = await Product.find(
    { ownerAdminID },
    { _id: 0, name: 1 }
  ).lean();
  const existingNames = new Set(existing.map((item) => String(item.name || '').trim().toLowerCase()));

  let insertedCount = 0;
  for (const product of sampleProducts) {
    const normalizedName = String(product.name || '').trim().toLowerCase();
    if (existingNames.has(normalizedName)) {
      continue;
    }

    await createProduct({ ...product, ownerAdminID });
    existingNames.add(normalizedName);
    insertedCount += 1;
  }

  if (insertedCount > 0) {
    console.log(`Inserted ${insertedCount} sample products for admin ${ownerAdminID}`);
  }
}

async function backfillLegacyOwnership(defaultAdminID) {
  await Product.updateMany(
    { ownerAdminID: { $exists: false } },
    { $set: { ownerAdminID: defaultAdminID } }
  );

  await Bill.updateMany(
    { ownerAdminID: { $exists: false } },
    { $set: { ownerAdminID: defaultAdminID } }
  );
}

async function initDatabase() {
  const mongoUri = buildMongoUri();

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || 'vyaparai'
  });

  const defaultAdmin = await seedDefaultAdmin();
  await backfillLegacyOwnership(defaultAdmin.userID);
  await seedSampleProducts(defaultAdmin.userID);
}

module.exports = {
  initDatabase,
  models: {
    User,
    Product,
    Cart,
    Bill
  },
  helpers: {
    createUser,
    createProduct,
    createCartItem,
    createBill
  }
};