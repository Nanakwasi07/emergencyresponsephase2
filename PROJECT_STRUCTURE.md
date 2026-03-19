# Project Structure Guide

## Current Directory Layout (with `src` Folders)

```
course-project/
│
├── Documentation Files
│   ├── README.md                    # Main setup guide
│   ├── QUICK_START.md              # 5-minute quick start
│   ├── ARCHITECTURE.md             # System design details
│   ├── IMPLEMENTATION.md           # Feature inventory
│   ├── API_TESTING_GUIDE.md        # Testing examples
│   └── PROJECT_STRUCTURE.md        # This file
│
├── Configuration & Setup
│   ├── package.json                # Root npm config
│   ├── .env.example                # Environment template
│   ├── .gitignore                  # Git ignore rules
│   ├── setup.sh                    # Unix/Linux setup script
│   └── setup.bat                   # Windows setup script
│
├── common/                         # Shared utilities (root level)
│   ├── middleware/
│   │   ├── auth.js                 # JWT token verification
│   │   └── errorHandler.js         # Global error handler
│   ├── utils/
│   │   └── helpers.js              # Haversine distance, validation
│   ├── validators/
│   │   └── schemas.js              # Joi validation schemas
│   └── services/
│       └── serviceClient.js        # HTTP service communication
│
└── services/                       # All microservices
    │
    ├── auth-service/
    │   ├── package.json            # Service dependencies
    │   └── src/                    # SOURCE CODE FOLDER
    │       ├── server.js           # Service startup & config
    │       ├── config/
    │       │   └── database.js     # MongoDB connection
    │       ├── models/
    │       │   └── User.js         # User schema & methods
    │       └── routes/
    │           └── auth.js         # Auth endpoints
    │
    ├── incident-service/
    │   ├── package.json
    │   └── src/                    # SOURCE CODE FOLDER
    │       ├── server.js           # Service startup & config
    │       ├── config/
    │       │   └── database.js     # MongoDB connection
    │       ├── models/
    │       │   └── Incident.js     # Incident schema
    │       └── routes/
    │           └── incidents.js    # Incident endpoints
    │
    ├── dispatch-service/
    │   ├── package.json
    │   └── src/                    # SOURCE CODE FOLDER
    │       ├── server.js           # Service startup & config
    │       ├── config/
    │       │   └── database.js     # MongoDB connection
    │       ├── models/
    │       │   └── Vehicle.js      # Vehicle & location schemas
    │       └── routes/
    │           └── vehicles.js     # Vehicle endpoints
    │
    └── analytics-service/
        ├── package.json
        └── src/                    # SOURCE CODE FOLDER
            ├── server.js           # Service startup & config
            ├── config/
            │   └── database.js     # MongoDB connection
            └── routes/
                └── analytics.js    # Analytics endpoints
```

## Key Points About the Structure

### `src` Folder Convention
- **Purpose**: All source code resides in `src` directories
- **Benefits**:
  - Clear separation between source code and configuration
  - Easier build processes for compilation/bundling
  - Professional Node.js project standard
  - Cleaner root directory

### Common Folder (Root Level)
- **Location**: `course-project/common/` (not in individual services)
- **Reason**: Shared across all services to avoid duplication
- **Contents**:
  - Middleware (auth verification, error handling)
  - Utilities (distance calculation, validation helpers)
  - Service client (inter-service HTTP communication)

### Import Paths

**From service to common resources:**
```javascript
// Example: From services/auth-service/src/routes/auth.js
const { verifyToken } = require('../../../../common/middleware/auth');
const { validateRequest, schemas } = require('../../../../common/validators/schemas');
```

**Each service accessing 4 levels up:**
- `services/` (1 level)
- `auth-service/` (2 level)
- `src/` (3 levels)
- `routes/` (4 levels)
- Up to `common/` (4 levels up: `../../../../`)

### Package.json Scripts

All services follow the same pattern:

```json
{
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

## Database Structure

Each service has its own MongoDB database:

```
MongoDB Instance
├── auth_service
│   └── users (collection)
├── incident_service
│   └── incidents (collection)
├── dispatch_service
│   ├── vehicles (collection)
│   └── locationhistories (collection)
└── analytics_service
    └── (minimal local storage)
```

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Models | **Singular, Capitalized** | `User.js`, `Incident.js` |
| Routes | **Plural, lowercase** | `auth.js`, `incidents.js` |
| Middleware | **Functionality name** | `auth.js`, `errorHandler.js` |
| Config | **Functionality name** | `database.js` |

## Service Entry Points

When you run a service, the entry point is always:

```bash
node services/<service-name>/src/server.js
```

Example:
```bash
node services/auth-service/src/server.js
```

Or using npm:
```bash
cd services/auth-service
npm run dev
```

## How Files Relate

### Auth Service Example

```
services/auth-service/src/
├── server.js                    # Loads routes, starts server
│   └── requires('./routes/auth')
│       └── routes/auth.js       # All /auth endpoints
│           ├── requires('./models/User')
│           │   └── models/User.js  # User schema
│           └── requires('../../../../common/middleware/auth')
│               └── common/middleware/auth.js  # JWT verification
│
└── config/database.js           # MongoDB connection
    └── used by server.js
```

## Adding New Endpoints

To add a new endpoint to a service:

1. **Update the route file**
   ```javascript
   // In src/routes/incidents.js
   router.post('/new-endpoint', verifyToken, async (req, res) => {
     // Handler code
   });
   ```

2. **Add Swagger documentation** (already above the endpoint)
   ```javascript
   /**
    * @swagger
    * /incidents/new-endpoint:
    *   post:
    *     summary: Description
    */
   ```

3. **Update validation** (if needed)
   ```javascript
   // In common/validators/schemas.js
   newEndpointSchema: Joi.object({
     // validation rules
   })
   ```

## Deploying a Service

1. Navigate to service folder:
   ```bash
   cd services/auth-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the service:
   ```bash
   npm start                    # Production
   npm run dev                  # Development
   ```

## Tips for Development

- **Auto-reload**: Use `npm run dev` for automatic restart on file changes
- **Logs**: Check terminal output for service startup confirmation
- **Health Check**: `curl http://localhost:3001/health`
- **Swagger**: Browse `http://localhost:3001/api-docs` for interactive testing
- **Common Changes**: If you modify `common/`, restart services to see changes

## Future Scalability

The current structure supports:
- ✅ Service replication (run multiple instances on different ports)
- ✅ Load balancing (add a reverse proxy)
- ✅ Containerization (Docker - put each service in a container)
- ✅ Kubernetes deployment (orchestrate containers)
- ✅ Horizontal scaling (independent service scaling)
