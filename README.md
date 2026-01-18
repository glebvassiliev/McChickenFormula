# 🏎️ F1 Strategy ML Platform

A comprehensive Formula 1 strategy analysis platform powered by Machine Learning, featuring real-time telemetry visualization, AI-powered strategy recommendations, and a Gemini-powered chatbot for race strategy discussions.

![F1 Strategy Platform](https://img.shields.io/badge/F1-Strategy%20Platform-E10600?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)

## ✨ Features

### 📊 Telemetry Dashboard
- Real-time lap time visualization
- Sector time breakdowns
- Tire stint tracking
- Driver comparison tools
- Weather condition monitoring

### 🧠 ML Strategy Models
- **Tire Strategy Model**: Predicts optimal compound selection and stint lengths
- **Pit Stop Predictor**: Identifies optimal pit windows and undercut opportunities
- **Race Pace Analyzer**: Predicts lap times and fuel effects
- **Position Predictor**: Forecasts overtaking opportunities and position changes

### 🤖 AI Strategy Chatbot
- Powered by Google Gemini AI
- Context-aware race strategy advice
- Real-time data integration
- Quick query templates for common scenarios

### 📡 OpenF1 Integration
- Live session data
- Historical race data
- Driver telemetry
- Weather information
- Race control messages

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
OPENF1_BASE_URL=https://api.openf1.org/v1
DATABASE_URL=sqlite+aiosqlite:///./f1_strategy.db
MODELS_DIR=./models
DATA_DIR=./data
DEBUG=true
EOF

# Create necessary directories
mkdir -p models data

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for chatbot | Required for AI features |
| `OPENF1_BASE_URL` | OpenF1 API base URL | `https://api.openf1.org/v1` |
| `DATABASE_URL` | SQLite database URL | `sqlite+aiosqlite:///./f1_strategy.db` |
| `MODELS_DIR` | Directory for trained models | `./models` |
| `DATA_DIR` | Directory for data storage | `./data` |

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 📁 Project Structure

```
McChickenFormula/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── telemetry.py
│   │   │   ├── strategy.py
│   │   │   ├── chatbot.py
│   │   │   ├── models.py
│   │   │   └── sessions.py
│   │   ├── models/        # ML models
│   │   │   ├── tire_strategy.py
│   │   │   ├── pit_stop_predictor.py
│   │   │   ├── race_pace_analyzer.py
│   │   │   └── position_predictor.py
│   │   ├── services/      # Business logic
│   │   │   ├── openf1_client.py
│   │   │   └── model_manager.py
│   │   ├── config.py
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TelemetryView.tsx
│   │   │   ├── StrategyAnalysis.tsx
│   │   │   ├── Chatbot.tsx
│   │   │   ├── SessionSelect.tsx
│   │   │   └── ModelStatus.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

## 🎮 Usage Guide

### 1. Select a Session

Navigate to **Sessions** to browse available F1 sessions from OpenF1. You can filter by year and session type (Race, Qualifying, Practice).

### 2. View Telemetry

The **Telemetry** page shows:
- Lap time progression charts
- Sector time breakdowns
- Tire stint history
- Detailed lap-by-lap data

### 3. Run Strategy Analysis

On the **Strategy** page:
1. Adjust race conditions using the sliders
2. Click "Run Analysis" to get ML predictions
3. Review tire compound recommendations
4. Check pit stop timing suggestions
5. See position change forecasts

### 4. Chat with AI Strategist

The **AI Strategist** chatbot can:
- Answer strategy questions
- Analyze race situations
- Provide tire and pit recommendations
- Explain F1 regulations and tactics

### 5. Train ML Models

Visit **ML Models** to:
- View model status
- Train individual models
- Train all models at once
- See training metrics

## 🧪 API Endpoints

### Telemetry
- `GET /api/telemetry/laps` - Get lap data
- `GET /api/telemetry/stints` - Get stint data
- `GET /api/telemetry/weather` - Get weather data
- `GET /api/telemetry/driver/{driver_number}/summary` - Get driver summary

### Strategy
- `POST /api/strategy/tire` - Get tire strategy prediction
- `POST /api/strategy/pit-stop` - Get pit stop prediction
- `POST /api/strategy/race-pace` - Analyze race pace
- `POST /api/strategy/position` - Predict position changes

### Chatbot
- `POST /api/chatbot/chat` - Send message to AI
- `GET /api/chatbot/quick-queries` - Get suggested queries

### Models
- `GET /api/models/status` - Get all model statuses
- `POST /api/models/train/{model_name}` - Train specific model
- `POST /api/models/train-all` - Train all models

### Sessions
- `GET /api/sessions/` - List sessions
- `GET /api/sessions/latest` - Get latest session
- `GET /api/sessions/{session_key}/drivers` - Get session drivers

## 🤖 ML Models Details

### Tire Strategy Model
- **Algorithm**: Random Forest + Gradient Boosting
- **Features**: Temperature, humidity, track characteristics, tire age, position
- **Outputs**: Recommended compound, stint length, degradation rate

### Pit Stop Predictor
- **Algorithm**: Gradient Boosting Classifier + Regressor
- **Features**: Gaps, tire status, track position value, safety car probability
- **Outputs**: Pit window status, optimal lap, undercut opportunity

### Race Pace Analyzer
- **Algorithm**: Gradient Boosting Regressor
- **Features**: Fuel load, tire age, weather, traffic
- **Outputs**: Predicted lap time, fuel effect, pace trend

### Position Predictor
- **Algorithm**: Random Forest + Gradient Boosting
- **Features**: Gaps, relative pace, tire advantage, DRS availability
- **Outputs**: Overtake probability, final position prediction

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🙏 Acknowledgments

- [OpenF1](https://openf1.org/) - For providing free F1 telemetry data
- [Google Gemini](https://deepmind.google/technologies/gemini/) - For AI capabilities
- The F1 community for inspiration

---

**Built with ❤️ for Formula 1 strategy enthusiasts**
