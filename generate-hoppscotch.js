const fs = require('fs');

const BASE_URL = 'http://localhost:4000';

function createRequest(name, method, path, body = null, params = []) {
  const req = {
    "v": "17",
    name,
    method,
    "endpoint": `${BASE_URL}${path}`,
    "params": params,
    "headers": [],
    "preRequestScript": "",
    "testScript": "",
    "auth": {
      "authType": "inherit",
      "authActive": true
    },
    "body": {
      "contentType": body ? "application/json" : null,
      "body": body ? JSON.stringify(body, null, 2) : null
    },
    "requestVariables": [],
    "responses": {},
    "description": null
  };
  return req;
}

function createFolder(name, requests) {
  return {
    "v": 12,
    name,
    "folders": [],
    "requests": requests,
    "auth": {
      "authType": "inherit",
      "authActive": true
    },
    "headers": [],
    "variables": [],
    "description": null,
    "preRequestScript": "",
    "testScript": ""
  };
}

const collection = {
  "v": 12,
  "name": "ShiftSync Backend APIs",
  "folders": [
    createFolder("Auth", [
      createRequest("Register", "POST", "/api/auth/register", { name: "Test User", email: "test@coastaleats.com", password: "password123", role: "staff" }),
      createRequest("Login", "POST", "/api/auth/login", { email: "admin@coastaleats.com", password: "admin123" }),
      createRequest("Refresh Token", "POST", "/api/auth/refresh", { refreshToken: "your_refresh_token_here" }),
      createRequest("Logout", "POST", "/api/auth/logout", { refreshToken: "your_refresh_token_here" })
    ]),
    createFolder("Users", [
      createRequest("Get All Users", "GET", "/api/users"),
      createRequest("Get Profile", "GET", "/api/users/profile"),
      createRequest("Get User By ID", "GET", "/api/users/123e4567-e89b-12d3-a456-426614174000"),
      createRequest("Update User", "PATCH", "/api/users/123e4567-e89b-12d3-a456-426614174000", { name: "Updated Name", desiredHours: 35 })
    ]),
    createFolder("Locations", [
      createRequest("Get All Locations", "GET", "/api/locations"),
      createRequest("Create Location", "POST", "/api/locations", { name: "Coastal Eats - Downtown", timezone: "America/New_York", address: "123 Main St" }),
      createRequest("Get Location By ID", "GET", "/api/locations/123e4567-e89b-12d3-a456-426614174000"),
      createRequest("Update Location", "PUT", "/api/locations/123e4567-e89b-12d3-a456-426614174000", { name: "Updated Location Name" }),
      createRequest("Delete Location", "DELETE", "/api/locations/123e4567-e89b-12d3-a456-426614174000")
    ]),
    createFolder("Skills", [
      createRequest("Get All Skills", "GET", "/api/skills"),
      createRequest("Create Skill", "POST", "/api/skills", { name: "bartender" })
    ]),
    createFolder("Shifts", [
      createRequest("Get All Shifts", "GET", "/api/shifts", null, [{ key: "startDate", value: "2026-05-01", active: true }, { key: "endDate", value: "2026-05-31", active: true }]),
      createRequest("Get My Shifts", "GET", "/api/shifts/user/me"),
      createRequest("Get Shift By ID", "GET", "/api/shifts/123e4567-e89b-12d3-a456-426614174000"),
      createRequest("Create Shift", "POST", "/api/shifts", { locationId: "loc_uuid", skillId: "skill_uuid", startUtc: "2026-05-15T14:00:00Z", endUtc: "2026-05-15T22:00:00Z", headcount: 2 }),
      createRequest("Update Shift", "PUT", "/api/shifts/123e4567-e89b-12d3-a456-426614174000", { headcount: 3 }),
      createRequest("Delete Shift", "DELETE", "/api/shifts/123e4567-e89b-12d3-a456-426614174000"),
      createRequest("Publish Shift", "POST", "/api/shifts/123e4567-e89b-12d3-a456-426614174000/publish"),
      createRequest("Publish Batch", "POST", "/api/shifts/publish-batch", { shiftIds: ["uuid1", "uuid2"] }),
      createRequest("Assign Staff", "POST", "/api/shifts/123e4567-e89b-12d3-a456-426614174000/assign", { userId: "user_uuid", ignoreConstraints: false }),
      createRequest("Remove Staff", "DELETE", "/api/shifts/123e4567-e89b-12d3-a456-426614174000/assign", { userId: "user_uuid" })
    ]),
    createFolder("Swaps & Drops", [
      createRequest("Get All Swaps", "GET", "/api/swaps"),
      createRequest("Get Swap By ID", "GET", "/api/swaps/123e4567-e89b-12d3-a456-426614174000"),
      createRequest("Request Swap/Drop", "POST", "/api/swaps", { shiftId: "shift_uuid", targetId: "target_user_uuid", reason: "Family emergency" }),
      createRequest("Accept Swap", "POST", "/api/swaps/123e4567-e89b-12d3-a456-426614174000/accept"),
      createRequest("Approve Swap", "POST", "/api/swaps/123e4567-e89b-12d3-a456-426614174000/approve", { managerNote: "Approved." }),
      createRequest("Reject Swap", "POST", "/api/swaps/123e4567-e89b-12d3-a456-426614174000/reject", { reason: "Insufficient coverage" }),
      createRequest("Cancel Swap", "POST", "/api/swaps/123e4567-e89b-12d3-a456-426614174000/cancel")
    ]),
    createFolder("Labor & Fairness", [
      createRequest("Get Labor Status", "GET", "/api/labor/status", null, [{ key: "locationId", value: "loc_uuid", active: true }, { key: "weekStart", value: "2026-05-04", active: true }]),
      createRequest("Evaluate Overtime", "GET", "/api/labor/overtime-eval", null, [{ key: "userId", value: "user_uuid", active: true }, { key: "proposedHours", value: "8", active: true }])
    ]),
    createFolder("Analytics", [
      createRequest("Get Dashboard Stats", "GET", "/api/analytics/dashboard"),
      createRequest("Get Fairness Report", "GET", "/api/analytics/fairness", null, [{ key: "startDate", value: "2026-05-01", active: true }, { key: "endDate", value: "2026-05-31", active: true }])
    ]),
    createFolder("Notifications", [
      createRequest("Get Notifications", "GET", "/api/notifications"),
      createRequest("Mark Read", "PATCH", "/api/notifications/123e4567-e89b-12d3-a456-426614174000/read"),
      createRequest("Mark All Read", "PATCH", "/api/notifications/read-all")
    ]),
    createFolder("Audit", [
      createRequest("Get Audit Logs", "GET", "/api/audit", null, [{ key: "entityType", value: "Shift", active: true }, { key: "entityId", value: "uuid", active: true }])
    ])
  ],
  "requests": [],
  "auth": {
    "authActive": true,
    "authType": "bearer",
    "token": "<YOUR_JWT_ACCESS_TOKEN>"
  },
  "headers": [],
  "variables": [],
  "description": "API collection for ShiftSync Coastal Eats Scheduling Platform.",
  "preRequestScript": "",
  "testScript": ""
};

fs.writeFileSync('test.json', JSON.stringify(collection, null, 2));
console.log('Successfully generated test.json');
