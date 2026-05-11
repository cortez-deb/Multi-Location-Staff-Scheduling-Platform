# ShiftSync Backend 

The robust API and constraint engine powering the ShiftSync scheduling platform.

## 🏗 Architecture

The backend is built as a RESTful Express API with real-time support via Socket.io. It follows a Service-Controller-Model architecture to ensure a clear separation of concerns, especially for the complex scheduling logic.

### Core Components

#### 1. Decision Engine (`services/assignment.service.js`)
The heart of the application. Every assignment undergoes an 8-step validation process:
1. **LOCATION_CERTIFIED**: User must be certified at the location.
2. **SKILL_MATCH**: User must possess the required skill.
3. **AVAILABILITY_CHECK**: Evaluates recurring windows and exceptions (Leave/Call-outs).
4. **DOUBLE_BOOKED**: Prevents overlapping shifts across all locations.
5. **REST_GAP**: Enforces a mandatory 10-hour gap between shifts.
6. **DAILY_HOURS_BLOCK**: Prevents shifts exceeding 12 hours in a single day.
7. **WEEKLY_HOURS_WARN**: Flags staff approaching or exceeding 40 hours.
8. **CONSECUTIVE_DAYS**: Blocks assignments on the 7th consecutive day of work.

#### 2. Timezone Management (`utils/timezone.js`)
Normalizes all operations to the location's physical timezone using IANA strings.

#### 3. Real-time Notifications (`socket.ts`)
Broadcasts state changes (shifts, swaps, overrides) to specific rooms based on role and location certification.

##  Development

### Installation
```bash
npm install
```

### Database Management
```bash
npm run db:reset    # Full reset: drop, create, migrate, and seed
npm run db:migrate  # Run pending migrations
npm run db:seed     # Apply seed data
```

### Running the Server
```bash
npm run dev         # Starts with nodemon
```

## API Documentation
The API is structured around the following core resources:
- `/api/auth`: Login, Logout, Session validation.
- `/api/shifts`: CRUD for shifts, assignments, and publishing.
- `/api/swaps`: Swap/Drop lifecycle management.
- `/api/users`: Profile, Availability, Certification, and Skills.
- `/api/notifications`: In-app notification management.
- `/api/leave`: Leave requests and availability exceptions.

