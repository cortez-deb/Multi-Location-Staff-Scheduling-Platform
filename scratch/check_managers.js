
import { User, ManagerLocation, Location } from './backend/models/index.js';

async function check() {
  const managers = await User.findAll({ where: { role: 'manager' } });
  console.log('Managers:', managers.map(m => m.name));
  
  for (const m of managers) {
    const locs = await ManagerLocation.findAll({ where: { userId: m.id } });
    console.log(`Manager ${m.name} manages:`, locs.map(l => l.locationId));
  }
}

check().catch(console.error);
