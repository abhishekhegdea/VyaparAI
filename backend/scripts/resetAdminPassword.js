require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { initDatabase, models } = require('../database/database');

async function main() {
  const email = process.argv[2] || 'abhishekhegdea@gmail.com';
  const newPassword = process.argv[3] || 'admin123';

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  await initDatabase();

  const { User } = models;
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { $set: { password: hashed, role: 'admin' } });

  console.log('PASSWORD_RESET_OK');
  console.log(`EMAIL=${email}`);
  console.log('ROLE_SET=admin');
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('PASSWORD_RESET_FAILED', error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
