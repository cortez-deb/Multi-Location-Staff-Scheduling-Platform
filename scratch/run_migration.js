import { sequelize } from '../backend/models/index.js';

async function run() {
  try {
    console.log('Adding "cancelled" to enum_ShiftAssignments_status...');
    await sequelize.query('ALTER TYPE "enum_ShiftAssignments_status" ADD VALUE IF NOT EXISTS \'cancelled\';');
    console.log('Successfully updated enum.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update enum:', err);
    process.exit(1);
  }
}

run();
