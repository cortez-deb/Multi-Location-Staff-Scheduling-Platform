import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeeklyHours, getDailyHours } from '../services/labor.service.js';

test('Labor Service - Overtime Calculations', async (t) => {
  assert.strictEqual(typeof getWeeklyHours, 'function');
  assert.strictEqual(typeof getDailyHours, 'function');
});
