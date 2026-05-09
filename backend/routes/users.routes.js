import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole, requireSelfOrAdmin } from '../middleware/auth.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), usersController.getAllUsers);

router.get('/:id', requireSelfOrAdmin(), usersController.getUser);

router.patch('/:id', [
  requireSelfOrAdmin(),
  body('name').optional().notEmpty(),
  body('desiredHours').optional().isInt({ min: 0 }),
  body('notifyInApp').optional().isBoolean(),
  body('notifyEmail').optional().isBoolean(),
  validate
], usersController.updateUser);

// Availability
router.get('/:id/availability', usersController.getAvailability); // logic inside controller checks self/admin/manager
router.post('/:id/availability', [
  requireSelfOrAdmin(),
  body('dayOfWeek').isInt({ min: 0, max: 6 }),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  validate
], usersController.createAvailability);
router.delete('/:id/availability/:availId', requireSelfOrAdmin(), usersController.deleteAvailability);

router.post('/:id/availability/exceptions', [
  requireSelfOrAdmin(),
  body('date').isDate(),
  body('available').isBoolean(),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  validate
], usersController.createAvailabilityException);

// Skills
router.get('/:id/skills', usersController.getSkills);
router.post('/:id/skills', [
  requireRole('admin'),
  body('skillId').isUUID(),
  validate
], usersController.addSkill);
router.delete('/:id/skills/:skillId', requireRole('admin'), usersController.removeSkill);

// Locations
router.get('/:id/locations', usersController.getLocations);
router.post('/:id/locations', [
  requireRole('admin'),
  body('locationId').isUUID(),
  validate
], usersController.addLocation);
router.delete('/:id/locations/:locationId', requireRole('admin'), usersController.removeLocation);

export default router;
