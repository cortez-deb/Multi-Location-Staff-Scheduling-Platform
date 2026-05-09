import { Op } from 'sequelize';
import { 
  Shift, ShiftAssignment, User, UserLocation, UserSkill, 
  Availability, AvailabilityException, Location, Skill 
} from '../models/index.js';
import { shiftWithinAvailability, toLocal, extractLocalDayAndTime } from '../utils/timezone.js';
import { getDailyHours, getConsecutiveDays, getWeeklyHours } from './labor.service.js';

export async function checkConstraints(userId, shiftId) {
  const shift = await Shift.findByPk(shiftId, {
    include: [
      { model: Location, as: 'location' },
      { model: Skill, as: 'skill' }
    ]
  });

  if (!shift) throw new Error('Shift not found');

  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const violations = [];
  const startUtc = shift.startUtc;
  const endUtc = shift.endUtc;
  const tz = shift.location.timezone;
  const localStart = toLocal(startUtc.toISOString(), tz);
  const localDate = localStart.toFormat('yyyy-MM-dd');

  // 1. Double-booking
  const overlappingAssignments = await ShiftAssignment.findAll({
    where: { userId, status: 'assigned' },
    include: [{
      model: Shift,
      as: 'shift',
      where: {
        [Op.or]: [
          { startUtc: { [Op.lt]: endUtc, [Op.gte]: startUtc } },
          { endUtc: { [Op.gt]: startUtc, [Op.lte]: endUtc } },
          { startUtc: { [Op.lte]: startUtc }, endUtc: { [Op.gte]: endUtc } }
        ]
      }
    }]
  });

  if (overlappingAssignments.length > 0) {
    const conflict = overlappingAssignments[0].shift;
    violations.push({
      rule: 'DOUBLE_BOOKING',
      message: `${user.name} is already assigned to a shift overlapping with this time.`,
    });
  }

  // 2. 10-hour gap
  const tenHoursMs = 10 * 60 * 60 * 1000;
  const allAssignments = await ShiftAssignment.findAll({
    where: { userId, status: 'assigned' },
    include: [{ model: Shift, as: 'shift' }]
  });

  for (const assignment of allAssignments) {
    const otherShift = assignment.shift;
    // skip the overlapping ones as they are covered by double booking
    if (otherShift.endUtc <= startUtc) {
      const gapMs = startUtc.getTime() - otherShift.endUtc.getTime();
      if (gapMs < tenHoursMs && gapMs >= 0) {
        violations.push({
          rule: 'TEN_HOUR_GAP',
          message: `Less than 10 hours gap from a previous shift (${Math.floor(gapMs / 60000)} mins gap).`,
        });
      }
    } else if (otherShift.startUtc >= endUtc) {
      const gapMs = otherShift.startUtc.getTime() - endUtc.getTime();
      if (gapMs < tenHoursMs && gapMs >= 0) {
        violations.push({
          rule: 'TEN_HOUR_GAP',
          message: `Less than 10 hours gap to the next shift (${Math.floor(gapMs / 60000)} mins gap).`,
        });
      }
    }
  }

  // 3. Skill match
  const userSkill = await UserSkill.findOne({ where: { userId, skillId: shift.skillId } });
  if (!userSkill) {
    violations.push({
      rule: 'SKILL_MISMATCH',
      message: `${user.name} does not have the required skill: ${shift.skill.name}.`,
    });
  }

  // 4. Location certification
  const userLocation = await UserLocation.findOne({ where: { userId, locationId: shift.locationId } });
  if (!userLocation) {
    violations.push({
      rule: 'LOCATION_NOT_CERTIFIED',
      message: `${user.name} is not certified to work at ${shift.location.name}.`,
    });
  }

  // 5. Availability
  const exception = await AvailabilityException.findOne({
    where: { userId, date: localDate }
  });

  let isAvailable = true;
  if (exception) {
    if (!exception.available) {
      isAvailable = false;
    } else if (exception.startTime && exception.endTime) {
      isAvailable = shiftWithinAvailability(startUtc.toISOString(), endUtc.toISOString(), exception.startTime, exception.endTime, tz);
    }
  } else {
    const { dayOfWeek } = extractLocalDayAndTime(localStart);
    const recurring = await Availability.findOne({ where: { userId, dayOfWeek } });
    if (recurring) {
      isAvailable = shiftWithinAvailability(startUtc.toISOString(), endUtc.toISOString(), recurring.startTime, recurring.endTime, tz);
    }
  }

  if (!isAvailable) {
    violations.push({
      rule: 'AVAILABILITY_VIOLATION',
      message: `Shift falls outside of ${user.name}'s availability.`,
    });
  }

  // 6. Daily cap
  const shiftHours = (endUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60);
  const currentDailyHours = await getDailyHours(userId, localDate, tz);
  if (currentDailyHours + shiftHours > 12) {
    violations.push({
      rule: 'EXCESSIVE_DAY',
      message: `Adding this shift would exceed the 12-hour daily maximum (${currentDailyHours + shiftHours} hours).`,
    });
  }

  // Add suggestions if there are violations
  if (violations.length > 0) {
    // Collect all certified staff for this location with this skill
    const eligibleStaffIds = await UserLocation.findAll({
      where: { locationId: shift.locationId },
      include: [{
        model: User,
        as: 'User', // default alias generated by belongsTo if not overridden... Wait, the alias was defined in models/index.js?
      }]
    });

    // Instead of doing complex subqueries, since the number of staff is small, we'll fetch potentials and filter
    const certifiedUserIds = (await UserLocation.findAll({ where: { locationId: shift.locationId } })).map(ul => ul.userId);
    const skilledUserIds = (await UserSkill.findAll({ where: { skillId: shift.skillId } })).map(us => us.userId);
    
    // Intersection
    let potentialUserIds = certifiedUserIds.filter(id => skilledUserIds.includes(id) && id !== userId);

    const validSuggestions = [];
    
    for (const uid of potentialUserIds) {
      // Fast checks using existing checkConstraints without suggestions recursively
      const v = await checkConstraintsWithoutSuggestions(uid, shiftId);
      if (v.length === 0) {
        // Find weekly hours to sort them
        const weekStartDt = localStart.startOf('week');
        const weeklyHours = await getWeeklyHours(uid, weekStartDt.toUTC().toISODate());
        const pUser = await User.findByPk(uid);
        validSuggestions.push({
          userId: uid,
          name: pUser.name,
          weeklyHours
        });
      }
    }

    validSuggestions.sort((a, b) => a.weeklyHours - b.weeklyHours);
    violations[0].suggestions = validSuggestions.slice(0, 3);
  }

  return violations;
}

// Internal version that doesn't compute suggestions to avoid infinite loops
async function checkConstraintsWithoutSuggestions(userId, shiftId) {
  const shift = await Shift.findByPk(shiftId, { include: [{ model: Location, as: 'location' }] });
  const startUtc = shift.startUtc;
  const endUtc = shift.endUtc;
  const tz = shift.location.timezone;
  const localStart = toLocal(startUtc.toISOString(), tz);
  const localDate = localStart.toFormat('yyyy-MM-dd');
  const violations = [];

  const overlappingAssignments = await ShiftAssignment.findAll({
    where: { userId, status: 'assigned' },
    include: [{
      model: Shift,
      as: 'shift',
      where: {
        [Op.or]: [
          { startUtc: { [Op.lt]: endUtc, [Op.gte]: startUtc } },
          { endUtc: { [Op.gt]: startUtc, [Op.lte]: endUtc } },
          { startUtc: { [Op.lte]: startUtc }, endUtc: { [Op.gte]: endUtc } }
        ]
      }
    }]
  });
  if (overlappingAssignments.length > 0) violations.push({});

  const allAssignments = await ShiftAssignment.findAll({
    where: { userId, status: 'assigned' },
    include: [{ model: Shift, as: 'shift' }]
  });
  const tenHoursMs = 10 * 60 * 60 * 1000;
  for (const assignment of allAssignments) {
    const otherShift = assignment.shift;
    if (otherShift.endUtc <= startUtc && (startUtc.getTime() - otherShift.endUtc.getTime()) < tenHoursMs) violations.push({});
    if (otherShift.startUtc >= endUtc && (otherShift.startUtc.getTime() - endUtc.getTime()) < tenHoursMs) violations.push({});
  }

  const exception = await AvailabilityException.findOne({ where: { userId, date: localDate } });
  let isAvailable = true;
  if (exception) {
    if (!exception.available) isAvailable = false;
    else if (exception.startTime && exception.endTime) isAvailable = shiftWithinAvailability(startUtc.toISOString(), endUtc.toISOString(), exception.startTime, exception.endTime, tz);
  } else {
    const { dayOfWeek } = extractLocalDayAndTime(localStart);
    const recurring = await Availability.findOne({ where: { userId, dayOfWeek } });
    if (recurring) {
      isAvailable = shiftWithinAvailability(startUtc.toISOString(), endUtc.toISOString(), recurring.startTime, recurring.endTime, tz);
    }
  }
  if (!isAvailable) violations.push({});

  const shiftHours = (endUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60);
  const currentDailyHours = await getDailyHours(userId, localDate, tz);
  if (currentDailyHours + shiftHours > 12) violations.push({});

  const consecutiveDays = await getConsecutiveDays(userId, localStart.minus({ days: 1 }).toFormat('yyyy-MM-dd'), tz);
  if (consecutiveDays + 1 >= 7) violations.push({});

  return violations;
}
