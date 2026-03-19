# Quick Start Guide

Get the emergency response system up and running in 5 minutes!

## ⚡ Prerequisites (5 min)

1. **Node.js** - Install from https://nodejs.org/ (v18 or higher)
2. **MongoDB** - Either:
   - Local: Install from https://www.mongodb.com/try/download/community
   - Cloud: Create free account at https://www.mongodb.com/cloud/atlas

## 🚀 Installation & Startup (Windows)

### Step 1: Navigate to Project Directory
```bash
cd "C:\Users\Nana Kwasi\Documents\CPEN 400\CPEN 421-MOBILE AND WEB ARCH\course-project"
```

### Step 2: Run Setup
```bash
setup.bat
```

### Step 3: Configure Environment
- Open `.env` file in a text editor
- Update `MONGODB_URI` if using MongoDB Atlas (cloud)
- Leave as is if using local MongoDB

### Step 4: Start MongoDB (if local)
```bash
mongod
```

### Step 5: Start All Services
```bash
npm run dev
```

✅ All services will start with auto-reload enabled!

---

## 🚀 Alternative: Start Services Individually

Open 4 separate terminals:

**Terminal 1 - Auth Service:**
```bash
cd services/auth-service
npm run dev
```

**Terminal 2 - Incident Service:**
```bash
cd services/incident-service
npm run dev
```

**Terminal 3 - Dispatch Service:**
```bash
cd services/dispatch-service
npm run dev
```

**Terminal 4 - Analytics Service:**
```bash
cd services/analytics-service
npm run dev
```

---

## 📊 Access Swagger UI

Open your browser to:

| Service | URL |
|---------|-----|
| Auth | http://localhost:3001/api-docs |
| Incident | http://localhost:3002/api-docs |
| Dispatch | http://localhost:3003/api-docs |
| Analytics | http://localhost:3004/api-docs |

---

## 🧪 Quick Test (5 minutes)

### 1. Register a User

Copy and paste in terminal:

```bash
curl -X POST http://localhost:3001/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John Admin\",\"email\":\"admin@test.com\",\"password\":\"Test123456\",\"role\":\"admin\"}"
```

Expected: User registered successfully ✅

### 2. Login and Get Token

```bash
curl -X POST http://localhost:3001/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"Test123456\"}"
```

**Copy the `accessToken` from response** - you'll need it for next steps!

### 3. Register a Vehicle

Replace `YOUR_TOKEN` with the token from step 2:

```bash
curl -X POST http://localhost:3003/vehicles/register ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"vehicleType\":\"ambulance\",\"serviceId\":\"hospital_001\",\"driverName\":\"Samuel\",\"latitude\":5.6037,\"longitude\":-0.1870}"
```

Expected: Vehicle registered ✅

### 4. Create an Incident

The system will automatically dispatch the nearest ambulance!

```bash
curl -X POST http://localhost:3002/incidents ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"citizenName\":\"Jane\",\"incidentType\":\"medical\",\"latitude\":5.6045,\"longitude\":-0.1855,\"notes\":\"Chest pain\",\"adminId\":\"admin_001\"}"
```

Expected: Incident created + responder matched automatically ✅

### 5. View Dashboard

```bash
curl -X GET http://localhost:3004/analytics/dashboard ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Dashboard with statistics ✅

---

## 🛠️ Troubleshooting

### ❌ "MongoDB connection failed"
**Solution:**
- Local: Run `mongod` in separate terminal
- Cloud: Update `MONGODB_URI` in `.env`

### ❌ "Port 3001 is already in use"
**Solution:**
- Windows: `netstat -ano | findstr :3001` then `taskkill /PID <PID>`
- Change port in `.env` if needed

### ❌ "Cannot find module"
**Solution:**
- Run `npm install` in service directory
- Delete `node_modules` and `package-lock.json`, then reinstall

### ❌ "JWT token expired"
**Solution:**
```bash
curl -X POST http://localhost:3001/auth/refresh-token ^
  -H "Content-Type: application/json" ^
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

---

## 📚 Learn More

- **Full Setup Guide**: See `README.md`
- **API Examples**: See `API_TESTING_GUIDE.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Implementation Details**: See `IMPLEMENTATION.md`

---

## 💡 Pro Tips

1. **Use Swagger UI** - Easier than curl! Just go to http://localhost:3001/api-docs
2. **Postman Collection** - Create one from Swagger endpoints
3. **Keep Logs Open** - Helps debug inter-service communication
4. **Environment Variables** - Keep `.env` out of git!

---

## ✅ What You Have

- ✅ 4 independent microservices
- ✅ JWT authentication with token refresh
- ✅ Automatic responder matching (distance-based)
- ✅ Real-time vehicle tracking
- ✅ Analytics dashboard
- ✅ Swagger API documentation
- ✅ MongoDB persistence
- ✅ Input validation
- ✅ Error handling

---

## 🎯 Next Steps

1. ✅ Backend running? Great!
2. ➡️ Read `API_TESTING_GUIDE.md` for comprehensive examples
3. ➡️ Explore Swagger UI to understand all endpoints
4. ➡️ Plan Phase 3 (React frontend)

---

## 💬 Need Help?

- Check service logs to see detailed errors
- Verify `.env` configuration
- Ensure MongoDB is running
- Check port availability
- Review documentation files

---

## 🎉 Success Checklist

- [ ] All 4 services displaying "running" messages
- [ ] Can access Swagger at localhost:3001/api-docs
- [ ] Can register a user
- [ ] Can login and get token
- [ ] Can register a vehicle
- [ ] Can create an incident
- [ ] Can view analytics dashboard

**If all checks pass, Phase 2 backend is complete! 🚀**

---

## Production Readiness

Current system is suitable for:
- ✅ Development
- ✅ Testing
- ✅ Demonstration
- ⚠️ Production (requires: Docker, Kubernetes, monitoring, scaling)

See `IMPLEMENTATION.md` for production deployment steps.

