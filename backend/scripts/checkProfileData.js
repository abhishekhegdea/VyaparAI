require('dotenv').config();
const mongoose = require('mongoose');
const { initDatabase, models } = require('../database/database');

async function main() {
  const email = process.argv[2] || 'abhishekhegdea@gmail.com';

  await initDatabase();

  const { User, Product, Bill } = models;

  const user = await User.findOne({ email }, { _id: 0, userID: 1, name: 1, email: 1, role: 1 }).lean();
  if (!user) {
    console.log(`USER_NOT_FOUND ${email}`);
    return;
  }

  const products = await Product.countDocuments({ ownerAdminID: user.userID });
  const bills = await Bill.countDocuments({ ownerAdminID: user.userID });

  console.log(`USER_EMAIL=${user.email}`);
  console.log(`USER_ID=${user.userID}`);
  console.log(`ROLE=${user.role}`);
  console.log(`PRODUCTS=${products}`);
  console.log(`BILLS=${bills}`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('CHECK_FAILED', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
