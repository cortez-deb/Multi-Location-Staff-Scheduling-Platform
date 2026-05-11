'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { DateTime } = require('luxon');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    const now = new Date();

    // 1. Users
    const adminId = uuidv4();
    const managerId = uuidv4();
    const manager2Id = uuidv4();
    const manager3Id = uuidv4();
    
    const staff1Id = uuidv4(); // John (Full-time)
    const staff2Id = uuidv4(); // Jane (Part-time)
    const staff3Id = uuidv4(); // Alice (Flexible)
    const staff4Id = uuidv4(); // Bob (Kitchen)
    const staff5Id = uuidv4(); // Elena (Server)
    const staff6Id = uuidv4(); // Mike (Bartender)
    const staff7Id = uuidv4(); // Sarah (General)

    await queryInterface.bulkInsert('Users', [
      { id: adminId, name: 'System Admin', email: 'admin@coastaleats.com', passwordHash: hash, role: 'admin', createdAt: now, updatedAt: now },
      { id: managerId, name: 'Downtown Manager', email: 'manager@coastaleats.com', passwordHash: hash, role: 'manager', createdAt: now, updatedAt: now },
      { id: manager2Id, name: 'Coastal North Manager', email: 'manager2@coastaleats.com', passwordHash: hash, role: 'manager', createdAt: now, updatedAt: now },
      { id: manager3Id, name: 'Coastal South Manager', email: 'manager3@coastaleats.com', passwordHash: hash, role: 'manager', createdAt: now, updatedAt: now },
      
      { id: staff1Id, name: 'John Doe (Overtime Test)', email: 'john@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 40, createdAt: now, updatedAt: now },
      { id: staff2Id, name: 'Jane Smith (Leave Test)', email: 'jane@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 20, createdAt: now, updatedAt: now },
      { id: staff3Id, name: 'Alice Jones (Fairness Test)', email: 'alice@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 35, createdAt: now, updatedAt: now },
      { id: staff4Id, name: 'Bob Wilson (Kitchen)', email: 'bob@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 25, createdAt: now, updatedAt: now },
      { id: staff5Id, name: 'Elena Rodriguez', email: 'elena@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 30, createdAt: now, updatedAt: now },
      { id: staff6Id, name: 'Mike Chang', email: 'mike@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 15, createdAt: now, updatedAt: now },
      { id: staff7Id, name: 'Sarah Miller', email: 'sarah@coastaleats.com', passwordHash: hash, role: 'staff', desiredHours: 40, createdAt: now, updatedAt: now }
    ]);

    // 2. Locations
    const loc1Id = uuidv4(); // Downtown
    const loc2Id = uuidv4(); // Beachside
    const loc3Id = uuidv4(); // Coastal North
    const loc4Id = uuidv4(); // Coastal South

    await queryInterface.bulkInsert('Locations', [
      { id: loc1Id, name: 'Downtown (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now },
      { id: loc2Id, name: 'Beachside (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now },
      { id: loc3Id, name: 'Coastal North (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now },
      { id: loc4Id, name: 'Coastal South (EST)', timezone: 'America/New_York', createdAt: now, updatedAt: now }
    ]);

    // 3. Skills
    const skillBartender = uuidv4();
    const skillServer = uuidv4();
    const skillKitchen = uuidv4();

    await queryInterface.bulkInsert('Skills', [
      { id: skillBartender, name: 'Bartender', createdAt: now, updatedAt: now },
      { id: skillServer, name: 'Server', createdAt: now, updatedAt: now },
      { id: skillKitchen, name: 'Kitchen Staff', createdAt: now, updatedAt: now }
    ]);

    // 4. Associations
    await queryInterface.bulkInsert('ManagerLocations', [
      { userId: managerId, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: manager2Id, locationId: loc3Id, createdAt: now, updatedAt: now },
      { userId: manager3Id, locationId: loc4Id, createdAt: now, updatedAt: now }
    ]);

    await queryInterface.bulkInsert('UserLocations', [
      { userId: staff1Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff2Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff3Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff3Id, locationId: loc2Id, createdAt: now, updatedAt: now },
      { userId: staff4Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff5Id, locationId: loc3Id, createdAt: now, updatedAt: now },
      { userId: staff6Id, locationId: loc4Id, createdAt: now, updatedAt: now },
      { userId: staff7Id, locationId: loc1Id, createdAt: now, updatedAt: now },
      { userId: staff7Id, locationId: loc3Id, createdAt: now, updatedAt: now }
    ]);

    await queryInterface.bulkInsert('UserSkills', [
      { userId: staff1Id, skillId: skillBartender, createdAt: now, updatedAt: now },
      { userId: staff1Id, skillId: skillServer, createdAt: now, updatedAt: now },
      { userId: staff2Id, skillId: skillServer, createdAt: now, updatedAt: now },
      { userId: staff3Id, skillId: skillBartender, createdAt: now, updatedAt: now },
      { userId: staff4Id, skillId: skillKitchen, createdAt: now, updatedAt: now },
      { userId: staff5Id, skillId: skillServer, createdAt: now, updatedAt: now },
      { userId: staff6Id, skillId: skillBartender, createdAt: now, updatedAt: now },
      { userId: staff7Id, skillId: skillServer, createdAt: now, updatedAt: now }
    ]);

    // 5. Availability (Recurring)
    const availabilities = [];
    // John (Staff 1): Mon-Sun 08:00-22:00 (Very available for overtime test)
    for (let i = 0; i <= 6; i++) {
      availabilities.push({ id: uuidv4(), userId: staff1Id, dayOfWeek: i, startTime: '08:00', endTime: '22:00', createdAt: now, updatedAt: now });
    }
    // Alice (Staff 3): Every day 12:00-22:00
    for (let i = 0; i <= 6; i++) {
      availabilities.push({ id: uuidv4(), userId: staff3Id, dayOfWeek: i, startTime: '12:00', endTime: '22:00', createdAt: now, updatedAt: now });
    }
    // Others
    for (let i = 1; i <= 5; i++) {
      availabilities.push({ id: uuidv4(), userId: staff5Id, dayOfWeek: i, startTime: '09:00', endTime: '17:00', createdAt: now, updatedAt: now });
      availabilities.push({ id: uuidv4(), userId: staff7Id, dayOfWeek: i, startTime: '10:00', endTime: '18:00', createdAt: now, updatedAt: now });
    }
    await queryInterface.bulkInsert('Availabilities', availabilities);

    // 6. Leave Requests & Exceptions (Simulating leave for Jane)
    const leave1Id = uuidv4();
    await queryInterface.bulkInsert('LeaveRequests', [
      {
        id: leave1Id,
        userId: staff2Id,
        startDate: '2026-05-14',
        endDate: '2026-05-15',
        reason: 'Family Trip',
        status: 'APPROVED',
        managerId: managerId,
        createdAt: now,
        updatedAt: now
      }
    ]);

    await queryInterface.bulkInsert('AvailabilityExceptions', [
      { id: uuidv4(), userId: staff2Id, date: '2026-05-14', available: false, leaveRequestId: leave1Id, createdAt: now, updatedAt: now },
      { id: uuidv4(), userId: staff2Id, date: '2026-05-15', available: false, leaveRequestId: leave1Id, createdAt: now, updatedAt: now }
    ]);

    // 7. Shifts
    const baseDate = DateTime.fromISO('2026-05-11T00:00:00', { zone: 'America/New_York' });
    const shiftData = [];

    // Week 1 Shifts for multiple locations
    const locations = [loc1Id, loc3Id, loc4Id];
    for (const locId of locations) {
      for (let day = 0; day < 7; day++) {
        const dayDt = baseDate.plus({ days: day });
        
        // Lunch Shift (6 hours)
        shiftData.push({
          id: uuidv4(),
          locationId: locId,
          skillId: skillServer,
          startUtc: dayDt.plus({ hours: 10 }).toJSDate(),
          endUtc: dayDt.plus({ hours: 16 }).toJSDate(),
          headcount: 2,
          isPublished: true,
          createdAt: now,
          updatedAt: now
        });

        // Dinner Shift (6 hours)
        shiftData.push({
          id: uuidv4(),
          locationId: locId,
          skillId: skillBartender,
          startUtc: dayDt.plus({ hours: 17 }).toJSDate(),
          endUtc: dayDt.plus({ hours: 23 }).toJSDate(),
          headcount: 1,
          isPublished: true,
          isPremium: (day === 4 || day === 5), // Fri/Sat premium
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('Shifts', shiftData);

    // 8. Assignments (Injecting Overtime)
    const assignments = [];
    
    // John (Staff 1) - Overtime Trap (Total 42 hours)
    // 7 shifts x 6 hours = 42 hours
    for (let day = 0; day < 7; day++) {
      // Find a server shift for John each day
      const shift = shiftData.find(s => s.locationId === loc1Id && s.skillId === skillServer && DateTime.fromJSDate(s.startUtc).hasSame(baseDate.plus({ days: day }), 'day'));
      if (shift) {
        assignments.push({ id: uuidv4(), shiftId: shift.id, userId: staff1Id, status: 'assigned', createdAt: now, updatedAt: now });
      }
    }

    // Alice (Staff 3) - Approaching Overtime (Total 36 hours)
    // 6 shifts x 6 hours = 36 hours
    for (let day = 0; day < 6; day++) {
       const shift = shiftData.find(s => s.locationId === loc1Id && s.skillId === skillBartender && DateTime.fromJSDate(s.startUtc).hasSame(baseDate.plus({ days: day }), 'day'));
       if (shift) {
         assignments.push({ id: uuidv4(), shiftId: shift.id, userId: staff3Id, status: 'assigned', createdAt: now, updatedAt: now });
       }
    }

    // Elena (Staff 5) - Assigned to North
    for (let day = 0; day < 3; day++) {
      const shift = shiftData.find(s => s.locationId === loc3Id && s.skillId === skillServer && DateTime.fromJSDate(s.startUtc).hasSame(baseDate.plus({ days: day }), 'day'));
      if (shift) {
        assignments.push({ id: uuidv4(), shiftId: shift.id, userId: staff5Id, status: 'assigned', createdAt: now, updatedAt: now });
      }
    }

    await queryInterface.bulkInsert('ShiftAssignments', assignments);

    // 9. Notifications (Simulated)
    await queryInterface.bulkInsert('Notifications', [
      {
        id: uuidv4(),
        userId: staff1Id,
        type: 'overtime_warning',
        title: 'Weekly Hours Warning',
        message: 'You have been scheduled for 42 hours this week, which exceeds your 40h threshold.',
        read: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        userId: managerId,
        type: 'LEAVE_REQUESTED',
        title: 'New Leave Request',
        message: 'Jane Smith has requested leave for May 14-15.',
        metadata: JSON.stringify({ leaveRequestId: leave1Id, staffName: 'Jane Smith', startDate: '2026-05-14', endDate: '2026-05-15', reason: 'Family Trip' }),
        read: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        userId: staff3Id,
        type: 'shift_assigned',
        title: 'New Shift Assigned',
        message: 'You have been assigned to a Dinner shift at Downtown on Saturday.',
        read: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 10. Swap Requests
    await queryInterface.bulkInsert('SwapRequests', [
      {
        id: uuidv4(),
        shiftId: assignments[0].shiftId,
        requesterId: staff1Id,
        status: 'PENDING_MANAGER',
        requesterNote: 'Need a break!',
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SwapRequests', null, {});
    await queryInterface.bulkDelete('ShiftAssignments', null, {});
    await queryInterface.bulkDelete('Shifts', null, {});
    await queryInterface.bulkDelete('AvailabilityExceptions', null, {});
    await queryInterface.bulkDelete('LeaveRequests', null, {});
    await queryInterface.bulkDelete('Availabilities', null, {});
    await queryInterface.bulkDelete('UserSkills', null, {});
    await queryInterface.bulkDelete('UserLocations', null, {});
    await queryInterface.bulkDelete('ManagerLocations', null, {});
    await queryInterface.bulkDelete('Skills', null, {});
    await queryInterface.bulkDelete('Locations', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
