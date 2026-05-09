'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    const adminId = uuidv4();
    const managerId = uuidv4();
    const staff1Id = uuidv4();
    const staff2Id = uuidv4();
    const staff3Id = uuidv4();

    const now = new Date();

    await queryInterface.bulkInsert('Users', [
      { id: adminId, name: 'Admin User', email: 'admin@coastaleats.com', passwordHash: hash, role: 'admin', createdAt: now, updatedAt: now },
      { id: managerId, name: 'Downtown Manager', email: 'manager1@coastaleats.com', passwordHash: hash, role: 'manager', createdAt: now, updatedAt: now },
      { id: staff1Id, name: 'John Doe', email: 'john@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 40, createdAt: now, updatedAt: now },
      { id: staff2Id, name: 'Jane Smith', email: 'jane@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 20, createdAt: now, updatedAt: now },
      { id: staff3Id, name: 'Alice Jones', email: 'alice@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 35, createdAt: now, updatedAt: now }
    ]);

    const loc1Id = uuidv4();
    const loc2Id = uuidv4();
    const loc3Id = uuidv4();
    const loc4Id = uuidv4();

    await queryInterface.bulkInsert('Locations', [
      { id: loc1Id, name: 'Downtown (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now },
      { id: loc2Id, name: 'Beachside (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now },
      { id: loc3Id, name: 'Uptown (CST)', timezone: 'America/Chicago', createdAt: now, updatedAt: now },
      { id: loc4Id, name: 'Westside (CST)', timezone: 'America/Chicago', createdAt: now, updatedAt: now }
    ]);

    const skill1Id = uuidv4();
    const skill2Id = uuidv4();

    await queryInterface.bulkInsert('Skills', [
      { id: skill1Id, name: 'Bartender', createdAt: now, updatedAt: now },
      { id: skill2Id, name: 'Server', createdAt: now, updatedAt: now }
    ]);

    // Manager manages Downtown
    await queryInterface.bulkInsert('ManagerLocations', [
      { userId: managerId, locationId: loc1Id, createdAt: now, updatedAt: now }
    ]);

    // Staff certifications
    await queryInterface.bulkInsert('UserLocations', [
      { userId: staff1Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff2Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff3Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff3Id, locationId: loc2Id, createdAt: now, updatedAt: now }
    ]);

    // Staff skills
    await queryInterface.bulkInsert('UserSkills', [
      { userId: staff1Id, skillId: skill1Id, createdAt: now, updatedAt: now },
      { userId: staff1Id, skillId: skill2Id, createdAt: now, updatedAt: now },
      { userId: staff2Id, skillId: skill2Id, createdAt: now, updatedAt: now },
      { userId: staff3Id, skillId: skill1Id, createdAt: now, updatedAt: now }
    ]);

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserSkills', null, {});
    await queryInterface.bulkDelete('UserLocations', null, {});
    await queryInterface.bulkDelete('ManagerLocations', null, {});
    await queryInterface.bulkDelete('Skills', null, {});
    await queryInterface.bulkDelete('Locations', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
