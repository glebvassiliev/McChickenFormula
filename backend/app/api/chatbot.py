"""
Gemini-Powered F1 Strategy Chatbot API
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import google.generativeai as genai
import logging
import json

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# System prompt for F1 strategy expertise
F1_STRATEGY_SYSTEM_PROMPT = """You are an expert Formula 1 Strategy Engineer AI assistant. You have deep knowledge of:

1. **Race Strategy**: Tire compounds (Soft/Medium/Hard/Intermediate/Wet), pit stop timing, undercuts, overcuts, fuel management
2. **Telemetry Analysis**: Lap times, sector times, speed traces, tire degradation curves, fuel consumption
3. **Weather Strategy**: Rain predictions, track temperature effects, tire behavior in different conditions
4. **Race Craft**: DRS usage, slipstream effects, defending positions, overtaking opportunities
5. **Regulations**: Current F1 regulations, tire allocation rules, pit lane rules, penalties
6. **Historical Data**: Past race strategies, team tendencies, track-specific strategies

When answering questions:
- Provide specific, actionable strategy advice
- Reference data and statistics when possible
- Consider risk vs reward trade-offs
- Think like a race strategist under pressure
- Use proper F1 terminology

If you're given real-time data, analyze it carefully and provide insights based on that data.

Current context may include live session data from OpenF1 API. Use this data to provide relevant, timely advice."""


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    conversation_history: List[ChatMessage] = []
    context: Optional[Dict[str, Any]] = None  # Live telemetry/strategy context


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str
    suggested_queries: List[str] = []
    relevant_data: Optional[Dict[str, Any]] = None


def get_gemini_client():
    """Initialize Gemini client"""
    if not settings.gemini_api_key:
        return None
    
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel('gemini-1.5-flash')


@router.post("/chat", response_model=ChatResponse)
async def chat_with_strategist(
    request: Request,
    chat_request: ChatRequest
):
    """Chat with AI Strategy Engineer"""
    model = get_gemini_client()
    
    if not model:
        # Fallback responses when API key not configured
        return ChatResponse(
            response=_get_fallback_response(chat_request.message),
            suggested_queries=_get_suggested_queries(chat_request.message)
        )
    
    try:
        # Build conversation context
        messages = []
        
        # Add system prompt
        messages.append({
            "role": "user",
            "parts": [F1_STRATEGY_SYSTEM_PROMPT]
        })
        messages.append({
            "role": "model", 
            "parts": ["Understood. I'm ready to provide F1 strategy analysis and advice. What would you like to know?"]
        })
        
        # Add conversation history
        for msg in chat_request.conversation_history:
            role = "user" if msg.role == "user" else "model"
            messages.append({"role": role, "parts": [msg.content]})
        
        # Add context if provided
        context_str = ""
        if chat_request.context:
            context_str = f"\n\n**Current Race Context:**\n```json\n{json.dumps(chat_request.context, indent=2)}\n```\n\n"
        
        # Create chat and send message
        chat = model.start_chat(history=messages)
        
        full_message = context_str + chat_request.message if context_str else chat_request.message
        response = chat.send_message(full_message)
        
        return ChatResponse(
            response=response.text,
            suggested_queries=_get_suggested_queries(chat_request.message),
            relevant_data=chat_request.context
        )
        
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return ChatResponse(
            response=_get_fallback_response(chat_request.message),
            suggested_queries=_get_suggested_queries(chat_request.message)
        )


@router.post("/analyze-situation")
async def analyze_race_situation(
    request: Request,
    session_key: int,
    driver_number: int
):
    """Get AI analysis of current race situation"""
    model = get_gemini_client()
    openf1_client = request.app.state.openf1_client
    model_manager = request.app.state.model_manager
    
    # Fetch current data
    driver_data = await openf1_client.get_driver_race_data(session_key, driver_number)
    weather = await openf1_client.get_weather(session_key)
    race_control = await openf1_client.get_race_control(session_key)
    
    # Get ML predictions
    # Build context for analysis
    context = {
        "driver_number": driver_number,
        "total_laps_completed": driver_data.get("total_laps", 0),
        "current_stint": driver_data.get("stints", [])[-1] if driver_data.get("stints") else None,
        "pit_stops": driver_data.get("total_pit_stops", 0),
        "weather": weather[-1] if weather else None,
        "recent_flags": [rc for rc in race_control[-5:]] if race_control else []
    }
    
    if not model:
        return {
            "analysis": _generate_basic_analysis(context),
            "context": context
        }
    
    try:
        prompt = f"""Analyze this F1 race situation and provide strategic recommendations:

**Current Situation:**
{json.dumps(context, indent=2)}

Provide:
1. Assessment of current position
2. Recommended strategy actions
3. Key risks to monitor
4. Opportunities to exploit

Be specific and actionable."""

        chat = model.start_chat(history=[
            {"role": "user", "parts": [F1_STRATEGY_SYSTEM_PROMPT]},
            {"role": "model", "parts": ["Ready for analysis."]}
        ])
        
        response = chat.send_message(prompt)
        
        return {
            "analysis": response.text,
            "context": context
        }
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return {
            "analysis": _generate_basic_analysis(context),
            "context": context
        }


@router.get("/quick-queries")
async def get_quick_queries():
    """Get list of common strategy queries"""
    return {
        "queries": [
            {
                "category": "Tire Strategy",
                "queries": [
                    "What tire compound should I use next?",
                    "How many laps can I expect from these tires?",
                    "Should I switch to a one-stop strategy?",
                    "Is the undercut viable with current gaps?"
                ]
            },
            {
                "category": "Pit Stops",
                "queries": [
                    "When is the optimal pit window?",
                    "Should I pit under this safety car?",
                    "How much time will I lose in the pit stop?",
                    "Can I overcut the car ahead?"
                ]
            },
            {
                "category": "Race Pace",
                "queries": [
                    "Why is my pace dropping?",
                    "How does tire degradation affect my lap times?",
                    "Should I push harder or manage the tires?",
                    "What's my fuel-adjusted pace?"
                ]
            },
            {
                "category": "Weather",
                "queries": [
                    "Should I switch to intermediates?",
                    "When is the rain expected?",
                    "How will track temperature affect grip?",
                    "What's the crossover point for wet tires?"
                ]
            },
            {
                "category": "Position Battles",
                "queries": [
                    "Can I overtake the car ahead?",
                    "How do I defend from the car behind?",
                    "Should I let my teammate through?",
                    "What's my best overtaking spot?"
                ]
            }
        ]
    }


def _get_fallback_response(message: str) -> str:
    """Generate fallback response when Gemini is unavailable"""
    message_lower = message.lower()
    
    if "tire" in message_lower or "tyre" in message_lower:
        return """**Tire Strategy Advice:**

Based on typical race conditions:
- **Soft (Red)**: Best for qualifying and short stints. High grip but degrades quickly.
- **Medium (Yellow)**: Balanced option. Good for race starts and longer stints.
- **Hard (White)**: Maximum durability but lower initial grip. Best for extended stints.

For optimal strategy, consider:
1. Track temperature (higher = more degradation)
2. Fuel load (heavier car = more tire stress)
3. Number of high-speed corners

Would you like me to analyze specific conditions? Please provide the session data for detailed recommendations."""

    elif "pit" in message_lower:
        return """**Pit Stop Strategy:**

Key factors for pit timing:
1. **Tire degradation curve** - Pit when lap time delta exceeds pit loss
2. **Track position** - Avoid emerging in traffic
3. **Gap to competitors** - Time the undercut/overcut properly
4. **Safety car probability** - Free pit stop opportunity

Typical pit window: When tire performance drops ~1.5-2s from peak

For specific timing, provide current lap, tire age, and gaps to competitors."""

    elif "weather" in message_lower or "rain" in message_lower:
        return """**Weather Strategy:**

Rain transitions are critical decision points:
- **Light rain**: Intermediates when standing water forms
- **Heavy rain**: Full wets immediately
- **Drying track**: Stay out longer on wets, time the switch carefully

Watch for:
- Radar forecasts
- Track temperature drops
- Spray from cars ahead

The crossover point (inters vs slicks) is typically when the track is ~80% dry."""

    elif "overtake" in message_lower or "position" in message_lower:
        return """**Overtaking Analysis:**

Key factors for successful overtakes:
1. **DRS availability** - Within 1 second
2. **Tire advantage** - Fresher rubber = better traction
3. **Battery deployment** - Full charge for the move
4. **Track position** - Identify overtaking zones

Best opportunities:
- End of long straights
- Heavy braking zones
- After mistakes from car ahead

Defensive driving: Cover the inside line, don't weave."""

    else:
        return """I'm your F1 Strategy Engineer assistant. I can help with:

🔴 **Tire Strategy** - Compound selection, stint planning
🔧 **Pit Stops** - Timing, undercuts, overcuts  
🌧️ **Weather** - Rain strategy, temperature effects
⚔️ **Race Craft** - Overtaking, defending, DRS usage
📊 **Telemetry** - Pace analysis, degradation curves

What would you like to analyze? For best results, provide:
- Current lap number
- Tire compound and age
- Gaps to nearby cars
- Weather conditions

Note: Connect your Gemini API key in .env for full AI capabilities."""


def _get_suggested_queries(message: str) -> List[str]:
    """Generate suggested follow-up queries"""
    message_lower = message.lower()
    
    if "tire" in message_lower or "tyre" in message_lower:
        return [
            "How many laps until I need to pit?",
            "Should I extend this stint?",
            "What's the tire degradation rate?"
        ]
    elif "pit" in message_lower:
        return [
            "Can I do a one-stop?",
            "Is the undercut viable?",
            "What compound for the next stint?"
        ]
    elif "weather" in message_lower:
        return [
            "When should I switch to inters?",
            "Is the track drying?",
            "How will rain affect strategy?"
        ]
    else:
        return [
            "Analyze my current tire situation",
            "When should I pit?",
            "How's my race pace?",
            "What's the weather forecast?"
        ]


def _generate_basic_analysis(context: Dict) -> str:
    """Generate basic analysis without AI"""
    analysis = ["**Race Situation Analysis**\n"]
    
    if context.get("current_stint"):
        stint = context["current_stint"]
        analysis.append(f"- Current tire: {stint.get('compound', 'Unknown')}")
        analysis.append(f"- Tire age: {stint.get('tyre_age_at_start', 0)} + laps since start")
    
    analysis.append(f"- Laps completed: {context.get('total_laps_completed', 0)}")
    analysis.append(f"- Pit stops made: {context.get('pit_stops', 0)}")
    
    if context.get("weather"):
        w = context["weather"]
        analysis.append(f"\n**Weather:**")
        analysis.append(f"- Track temp: {w.get('track_temperature', 'N/A')}°C")
        analysis.append(f"- Air temp: {w.get('air_temperature', 'N/A')}°C")
        if w.get("rainfall"):
            analysis.append("- ⚠️ Rain detected!")
    
    analysis.append("\n*Connect Gemini API for detailed AI analysis*")
    
    return "\n".join(analysis)
