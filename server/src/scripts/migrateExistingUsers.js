const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { getOrCreateUserSpreadsheet } = require('../services/googleSheetsService');

async function migrateExistingUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Assign existing legacy spreadsheet to skmusharaf01@gmail.com if not already assigned
    const legacySpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1hftbqkK2yEC_KY-GR-eSJpmurFkrwN-zkcfTVdPd0oI';
    const primaryUser = await User.findOne({ email: 'skmusharaf01@gmail.com' });
    if (primaryUser) {
      if (!primaryUser.spreadsheetId) {
        primaryUser.spreadsheetId = legacySpreadsheetId;
        await primaryUser.save();
        console.log(`Assigned existing spreadsheet ${legacySpreadsheetId} to ${primaryUser.email}`);
      } else {
        console.log(`User ${primaryUser.email} already has spreadsheetId: ${primaryUser.spreadsheetId}`);
      }
    }

    // 2. Check all other users
    const allUsers = await User.find({});
    console.log(`Total users in system: ${allUsers.length}`);

    for (const user of allUsers) {
      if (user.spreadsheetId) {
        console.log(`User ${user.email} -> spreadsheetId: ${user.spreadsheetId}`);
      } else {
        console.log(`User ${user.email} has no spreadsheetId. Attempting creation...`);
        try {
          const sid = await getOrCreateUserSpreadsheet(user);
          console.log(`Assigned new spreadsheet ${sid} to ${user.email}`);
        } catch (err) {
          console.log(`Could not create spreadsheet for ${user.email}: ${err.message}`);
        }
      }
    }

    console.log('Migration check complete.');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  migrateExistingUsers();
}

module.exports = migrateExistingUsers;
