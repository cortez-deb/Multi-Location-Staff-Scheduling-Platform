import { Op } from 'sequelize';
import { Shift, ShiftAssignment, SwapRequest, AuditLog, Location, Skill, User, UserLocation, UserSkill } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { notify } from '../utils/notificationHelper.js';
import { checkConstraints } from '../services/assignment.service.js';
import redisClient from '../config/redis.js';
import { swapQueue } from '../jobs/queues.js';
import { getIO } from '../sockets/index.js';

export async function createShift(req, res, next) {
  try {
    const { locationId, skillId, startUtc, endUtc, headcount } = req.body;
    
    // Check permission if manager
    if (req.user.role === 'manager') {
      const ml = await req.user.managedLocations || []; // need to query if not in req.user
    }

    const shift = await Shift.create({ locationId, skillId, startUtc, endUtc, headcount });
    await logAudit(req.user.userId, 'Shift', shift.id, 'SHIFT_CREATED', null, shift.toJSON());
    
    res.status(201).json(shift);
  } catch (err) {
    next(err);
  }
}

export async function getShifts(req, res, next) {
  try {
    const { locationId, startDate, endDate, published } = req.query;
    const where = {};
    if (locationId) where.locationId = locationId;
    if (published !== undefined) where.isPublished = published === 'true';
    if (startDate || endDate) {
      where.startUtc = {};
      if (startDate) where.startUtc[Op.gte] = new Date(startDate);
      if (endDate) where.startUtc[Op.lte] = new Date(endDate);
    }

    const shifts = await Shift.findAll({
      where,
      include: [
        { model: ShiftAssignment, as: 'assignments' }
      ]
    });
    res.json(shifts);
  } catch (err) {
    next(err);
  }
}

export async function getShift(req, res, next) {
  try {
    const shift = await Shift.findByPk(req.params.id, {
      include: [
        { model: ShiftAssignment, as: 'assignments' }
      ]
    });
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function updateShift(req, res, next) {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });

    const before = shift.toJSON();
    const { startUtc, endUtc, headcount } = req.body;
    if (startUtc !== undefined) shift.startUtc = startUtc;
    if (endUtc !== undefined) shift.endUtc = endUtc;
    if (headcount !== undefined) shift.headcount = headcount;

    await shift.save();
    await logAudit(req.user.userId, 'Shift', shift.id, 'SHIFT_UPDATED', before, shift.toJSON());

    // If shift has swaps in PENDING_MANAGER, cancel them via Job
    const pendingSwaps = await SwapRequest.findAll({
      where: { shiftId: shift.id, status: 'PENDING_MANAGER' }
    });
    for (const swap of pendingSwaps) {
      await swapQueue.add('cancelSwapOnShiftEdit', {
        swapRequestId: swap.id,
        editedBy: req.user.userId
      });
    }

    const io = getIO();
    io.to(`location:${shift.locationId}`).emit('shift:updated', {
      shiftId: shift.id,
      changes: req.body
    });

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function deleteShift(req, res, next) {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });

    const before = shift.toJSON();
    await shift.destroy();
    await logAudit(req.user.userId, 'Shift', shift.id, 'SHIFT_DELETED', before, null);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function publishShift(req, res, next) {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });

    const before = shift.toJSON();
    shift.isPublished = true;
    await shift.save();

    await logAudit(req.user.userId, 'Shift', shift.id, 'SHIFT_PUBLISHED', before, shift.toJSON());

    const io = getIO();
    io.to(`location:${shift.locationId}`).emit('shift:published', {
      shiftId: shift.id,
      locationId: shift.locationId
    });

    // Notify assigned staff
    const assignments = await ShiftAssignment.findAll({ where: { shiftId: shift.id, status: 'assigned' } });
    for (const assignment of assignments) {
      await notify(assignment.userId, 'SHIFT_PUBLISHED', 'A shift you are assigned to has been published.', { shiftId: shift.id }, io);
    }

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function unpublishShift(req, res, next) {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });

    const now = new Date();
    const cutoffDate = new Date(shift.startUtc.getTime() - shift.cutoffHours * 60 * 60 * 1000);
    
    if (now > cutoffDate) {
      return res.status(400).json({ error: 'PAST_CUTOFF', message: `Cannot unpublish within ${shift.cutoffHours} hours of start` });
    }

    const before = shift.toJSON();
    shift.isPublished = false;
    await shift.save();

    await logAudit(req.user.userId, 'Shift', shift.id, 'SHIFT_UNPUBLISHED', before, shift.toJSON());
    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function getShiftHistory(req, res, next) {
  try {
    const logs = await AuditLog.findAll({
      where: { entityType: 'Shift', entityId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

export async function createAssignment(req, res, next) {
  const { userId, overrideReason } = req.body;
  const shiftId = req.params.id;
  const lockKey = `lock:staff:${userId}:assign`;
  
  try {
    // Acquire Redis lock with 100ms TTL
    const lock = await redisClient.set(lockKey, 'locked', 'NX', 'PX', 100);
    if (!lock) {
      return res.status(409).json({
        error: 'CONCURRENT_ASSIGNMENT',
        message: 'Another manager is currently assigning this person. Please try again.'
      });
    }

    try {
      const violations = await checkConstraints(userId, shiftId);
      
      const hardBlocks = violations.filter(v => 
        ['DOUBLE_BOOKING', 'TEN_HOUR_GAP', 'SKILL_MISMATCH', 'LOCATION_NOT_CERTIFIED', 'AVAILABILITY_VIOLATION', 'EXCESSIVE_DAY'].includes(v.rule)
      );

      if (hardBlocks.length > 0) {
        return res.status(422).json({
          error: 'CONSTRAINT_VIOLATION',
          ...hardBlocks[0] // Returns rule, message, suggestions
        });
      }

      const seventhDayBlock = violations.find(v => v.rule === 'SEVENTH_DAY');
      if (seventhDayBlock && !overrideReason) {
        return res.status(422).json({
          error: 'OVERRIDE_REQUIRED',
          rule: 'SEVENTH_DAY',
          message: seventhDayBlock.message
        });
      }

      const assignment = await ShiftAssignment.create({
        shiftId,
        userId,
        status: 'assigned'
      });

      const auditData = overrideReason ? { overrideReason } : null;
      await logAudit(req.user.userId, 'ShiftAssignment', assignment.id, 'ASSIGNMENT_CREATED', null, { ...assignment.toJSON(), ...auditData });

      const io = getIO();
      io.to(`user:${userId}`).emit('assignment:created', {
        shiftId,
        userId
      });

      return res.status(201).json(assignment);
    } finally {
      // Release lock
      await redisClient.del(lockKey);
    }
  } catch (err) {
    next(err);
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    const { id: shiftId, userId } = req.params;
    const assignment = await ShiftAssignment.findOne({ where: { shiftId, userId } });
    if (!assignment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });

    const before = assignment.toJSON();
    await assignment.destroy();
    await logAudit(req.user.userId, 'ShiftAssignment', assignment.id, 'ASSIGNMENT_DELETED', before, null);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getEligibleStaff(req, res, next) {
  try {
    const shiftId = req.params.id;
    const shift = await Shift.findByPk(shiftId);
    if (!shift) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shift not found' });

    // Find all users who have the skill and location certification
    const userLocations = await UserLocation.findAll({ where: { locationId: shift.locationId } });
    const userSkills = await UserSkill.findAll({ where: { skillId: shift.skillId } });
    
    const locUserIds = userLocations.map(ul => ul.userId);
    const skillUserIds = userSkills.map(us => us.userId);
    const candidateIds = locUserIds.filter(id => skillUserIds.includes(id));

    const eligible = [];
    for (const uid of candidateIds) {
      const violations = await checkConstraints(uid, shiftId);
      // If no hard blocks, they are eligible (we can include those needing override)
      const hardBlocks = violations.filter(v => 
        ['DOUBLE_BOOKING', 'TEN_HOUR_GAP', 'SKILL_MISMATCH', 'LOCATION_NOT_CERTIFIED', 'AVAILABILITY_VIOLATION', 'EXCESSIVE_DAY'].includes(v.rule)
      );
      if (hardBlocks.length === 0) {
        const user = await User.findByPk(uid, { attributes: { exclude: ['passwordHash'] } });
        eligible.push({ ...user.toJSON(), warnings: violations });
      }
    }

    res.json(eligible);
  } catch (err) {
    next(err);
  }
}
