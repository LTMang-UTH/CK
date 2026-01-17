#!/bin/bash

# RealChat v2.0 Quick Start Script
# FastAPI + MongoDB + Vue.js 3

echo "🚀 RealChat v2.0 - Quick Start"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}1️⃣  Checking MongoDB...${NC}"
if ! command -v mongosh &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found. Install with: brew install mongodb-community${NC}"
else
    echo -e "${GREEN}✓ MongoDB installed${NC}"
    # Start MongoDB if not running
    if ! pgrep -x "mongod" > /dev/null; then
        echo -e "${BLUE}Starting MongoDB...${NC}"
        brew services start mongodb-community 2>/dev/null
        sleep 2
    fi
fi

echo ""
echo -e "${BLUE}2️⃣  Setting up Backend...${NC}"
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo -e "${BLUE}3️⃣  Setting up Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm packages...${NC}"
    npm install -q
fi
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "================================"
echo "📌 Next Steps:"
echo "================================"
echo ""
echo -e "${BLUE}Terminal 1 - Start Backend:${NC}"
echo "  cd backend"
echo "  python -m uvicorn main:app --reload"
echo ""
echo -e "${BLUE}Terminal 2 - Start Frontend:${NC}"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Open Browser:${NC}"
echo "  🌐 http://localhost:5173"
echo ""
echo "📚 API Documentation:"
echo "  📖 http://localhost:8000/docs"
echo ""
echo "🛑 To Stop Services:"
echo "  • Ctrl+C in each terminal"
echo "  • Stop MongoDB: brew services stop mongodb-community"
echo ""
