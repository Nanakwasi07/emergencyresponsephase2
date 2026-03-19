#!/bin/bash
# Setup script for Emergency Response System

echo "================================"
echo "Emergency Response System Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your MongoDB URI and JWT secret."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
npm install

# Install each service's dependencies
echo ""
echo "Installing Auth Service dependencies..."
cd services/auth-service && npm install && cd ../..

echo "Installing Incident Service dependencies..."
cd services/incident-service && npm install && cd ../..

echo "Installing Dispatch Service dependencies..."
cd services/dispatch-service && npm install && cd ../..

echo "Installing Analytics Service dependencies..."
cd services/analytics-service && npm install && cd ../..

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Ensure MongoDB is running"
echo "3. Run: npm run dev (for development)"
echo "4. Run: npm start (for production)"
echo ""
echo "Access Swagger UI at:"
echo "  Auth Service: http://localhost:3001/api-docs"
echo "  Incident Service: http://localhost:3002/api-docs"
echo "  Dispatch Service: http://localhost:3003/api-docs"
echo "  Analytics Service: http://localhost:3004/api-docs"
