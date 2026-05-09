import { 
  User, Availability, AvailabilityException, Skill, Location, UserSkill, UserLocation, 
  ManagerLocation, ShiftAssignment, SwapRequest 
} from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { notify } from '../utils/notificationHelper.js';
import { getIO } from '../sockets/index.js';

export async function getAllUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['passwordHash'] }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] }
    });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { name, desiredHours, notifyInApp, notifyEmail } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });

    const before = user.toJSON();

    if (name !== undefined) user.name = name;
    if (desiredHours !== undefined) user.desiredHours = desiredHours;
    if (notifyInApp !== undefined) user.notifyInApp = notifyInApp;
    if (notifyEmail !== undefined) user.notifyEmail = notifyEmail;

    await user.save();

    await logAudit(req.user.userId, 'User', user.id, 'USER_UPDATED', before, user.toJSON());

    const updatedUser = user.toJSON();
    delete updatedUser.passwordHash;
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const userId = req.params.id;
    
    // Check permissions: self, admin, or manager of user's location
    if (req.user.role === 'manager' && req.user.userId !== userId) {
      const userLocations = await UserLocation.findAll({ where: { userId } });
      const managerLocations = await ManagerLocation.findAll({ where: { userId: req.user.userId } });
      
      const userLocIds = userLocations.map(ul => ul.locationId);
      const managerLocIds = managerLocations.map(ml => ml.locationId);
      
      const hasOverlap = userLocIds.some(id => managerLocIds.includes(id));
      if (!hasOverlap) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to view this user\'s availability' });
      }
    }

    const availabilities = await Availability.findAll({ where: { userId } });
    const exceptions = await AvailabilityException.findAll({ where: { userId } });

    res.json({ availabilities, exceptions });
  } catch (err) {
    next(err);
  }
}

export async function createAvailability(req, res, next) {
  try {
    const userId = req.params.id;
    const { dayOfWeek, startTime, endTime } = req.body;

    const availability = await Availability.create({
      userId,
      dayOfWeek,
      startTime,
      endTime
    });

    await logAudit(req.user.userId, 'Availability', availability.id, 'AVAILABILITY_CREATED', null, availability.toJSON());
    res.status(201).json(availability);
  } catch (err) {
    next(err);
  }
}

export async function deleteAvailability(req, res, next) {
  try {
    const availability = await Availability.findByPk(req.params.availId);
    if (!availability) return res.status(404).json({ error: 'NOT_FOUND', message: 'Availability not found' });
    
    const before = availability.toJSON();
    await availability.destroy();

    await logAudit(req.user.userId, 'Availability', availability.id, 'AVAILABILITY_DELETED', before, null);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function createAvailabilityException(req, res, next) {
  try {
    const userId = req.params.id;
    const { date, available, startTime, endTime } = req.body;

    const exception = await AvailabilityException.create({
      userId,
      date,
      available,
      startTime,
      endTime
    });

    await logAudit(req.user.userId, 'AvailabilityException', exception.id, 'AVAILABILITY_EXCEPTION_CREATED', null, exception.toJSON());
    res.status(201).json(exception);
  } catch (err) {
    next(err);
  }
}

export async function getSkills(req, res, next) {
  try {
    const skills = await UserSkill.findAll({
      where: { userId: req.params.id },
      include: [{ model: Skill, as: 'Skill' }]
    });
    res.json(skills);
  } catch (err) {
    next(err);
  }
}

export async function addSkill(req, res, next) {
  try {
    const { skillId } = req.body;
    const userId = req.params.id;

    await UserSkill.findOrCreate({
      where: { userId, skillId }
    });

    res.status(201).json({ message: 'Skill added' });
  } catch (err) {
    next(err);
  }
}

export async function removeSkill(req, res, next) {
  try {
    await UserSkill.destroy({
      where: { userId: req.params.id, skillId: req.params.skillId }
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getLocations(req, res, next) {
  try {
    const locations = await UserLocation.findAll({
      where: { userId: req.params.id },
      include: [{ model: Location, as: 'Location' }]
    });
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

export async function addLocation(req, res, next) {
  try {
    const { locationId } = req.body;
    const userId = req.params.id;

    await UserLocation.findOrCreate({
      where: { userId, locationId }
    });

    await logAudit(req.user.userId, 'UserLocation', userId, 'CERTIFY_LOCATION', null, { locationId });
    res.status(201).json({ message: 'Location certified' });
  } catch (err) {
    next(err);
  }
}

export async function removeLocation(req, res, next) {
  try {
    const userId = req.params.id;
    const locationId = req.params.locationId;

    const cert = await UserLocation.findOne({ where: { userId, locationId } });
    if (!cert) return res.status(404).json({ error: 'NOT_FOUND', message: 'Certification not found' });

    await cert.destroy();

    // Any PENDING_ACCEPT or PENDING_MANAGER SwapRequests involving this user and this location's shifts must be cancelled
    const swaps = await SwapRequest.findAll({
      where: {
        status: ['PENDING_ACCEPT', 'PENDING_MANAGER']
      },
      include: [{
        model: Shift,
        as: 'shift',
        where: { locationId }
      }]
    });

    const io = getIO();

    for (const swap of swaps) {
      // Check if this user is involved in the swap
      if (swap.requesterId === userId || swap.targetId === userId) {
        const before = swap.toJSON();
        swap.status = 'CANCELLED';
        await swap.save();

        await logAudit(req.user.userId, 'SwapRequest', swap.id, 'SWAP_CANCELLED_DECERTIFIED', before, swap.toJSON());

        await notify(
          swap.requesterId,
          'SWAP_CANCELLED',
          `Swap request cancelled because a staff member was decertified from the location.`,
          { swapRequestId: swap.id },
          io
        );

        io.to(`user:${swap.requesterId}`).emit('swap:statusChanged', { swapRequestId: swap.id, newStatus: 'CANCELLED' });

        if (swap.targetId) {
          await notify(
            swap.targetId,
            'SWAP_CANCELLED',
            `Swap request cancelled because a staff member was decertified from the location.`,
            { swapRequestId: swap.id },
            io
          );
          io.to(`user:${swap.targetId}`).emit('swap:statusChanged', { swapRequestId: swap.id, newStatus: 'CANCELLED' });
        }
      }
    }

    await logAudit(req.user.userId, 'UserLocation', userId, 'DECERTIFY_LOCATION', { locationId }, null);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
