# 🔬 Hybrid ML Approach Explained

## Overview

The F1 Strategy ML Platform uses a **hybrid approach** that combines:
- **Real OpenF1 Data** (70% weight) - Actual race outcomes and decisions
- **Domain Knowledge** (30% weight) - F1 strategy principles and rules

## Why Hybrid?

### The Problem with Pure ML
- **Limited real data**: OpenF1 only has 2023-2024 data
- **Incomplete sessions**: Not all races have complete telemetry
- **Sparse labels**: Tire strategies and pit stops aren't always labeled
- **Cold start**: Can't train models without historical data

### The Problem with Pure Rules
- **Too rigid**: Can't adapt to actual race patterns
- **Missing nuance**: Real races have complex interactions
- **No learning**: Doesn't improve from experience

### The Hybrid Solution ✅
**Best of both worlds:**
1. **Learns from real data** when available (actual tire choices, pit timings, degradation patterns)
2. **Falls back to domain knowledge** when data is missing
3. **Weights real data more heavily** (70%) so real patterns dominate
4. **Improves robustness** - works even with limited data

## How It Works

### 1. Real Data Collection
```python
# From actual OpenF1 sessions:
- Tire compound actually used → Label: "optimal_compound"
- Actual stint length → Label: "optimal_stint_length"  
- Real degradation from lap times → Label: "degradation_rate"
- Actual pit stop lap → Label: "optimal_pit_lap"
```

### 2. Domain Knowledge Rules
```python
# F1 strategy principles:
- Rain > 70% → Use WET/INTERMEDIATE tires
- Track temp > 40°C → Favor HARD tires
- Remaining laps < 15 → Use SOFT for sprint finish
- Tire age 15-30 laps → Optimal pit window
```

### 3. Weighted Combination
```python
# Training weights:
Real data:     70% weight (learn actual patterns)
Synthetic:     30% weight (fill gaps, ensure coverage)
```

## What Gets Learned?

### With Real Data:
✅ **Real tire behavior patterns** - How compounds actually perform
✅ **Track-specific strategies** - Monaco vs Monza differences
✅ **Weather adaptation** - How teams actually respond to rain
✅ **Race situation responses** - Undercuts that actually worked
✅ **Tire degradation curves** - Real pace drop-off patterns

### With Domain Knowledge:
✅ **F1 principles** - Rain tire rules, temperature effects
✅ **Strategy logic** - When to pit, compound selection basics
✅ **Coverage** - Works for any track/condition combo
✅ **Robustness** - Doesn't fail when data is missing

## Model Quality

| Training Data Source | Model Quality | Use Case |
|---------------------|---------------|----------|
| **Pure Synthetic** | Good baseline | Demo/Development |
| **Hybrid (70/30)** | **Best overall** | **Production** |
| **Pure Real** | Excellent (if enough data) | Ideal (rarely possible) |

## Example: Tire Strategy Model

### Real Data Input (70% weight):
```python
{
  "track_temperature": 45,  # From actual weather data
  "actual_compound": "HARD",  # What team actually used
  "actual_stint_length": 32,  # Real stint length
  "real_degradation": 0.08,  # Calculated from lap times
  "confidence": 1.0
}
```

### Synthetic Data Input (30% weight):
```python
{
  "track_temperature": 42,  # Generated based on real range
  "optimal_compound": "HARD",  # From rule: temp > 40°C
  "optimal_stint_length": 35,  # From domain: HARD base = 35
  "degradation_rate": 0.07,  # From rule: hot = more degradation
  "confidence": 0.3
}
```

### Model Output:
- **Learns**: "High temps → Hard tires" (from both sources)
- **Refines**: Actual stint length is 32, not 35 (real data corrects rule)
- **Generalizes**: Works even for tracks not in training data

## Adjusting the Hybrid Balance

You can adjust the weights in the training API:

```python
# More real data focus (80/20)
POST /api/models/train/tire_strategy
{
  "hybrid_mode": true,
  "real_data_weight": 0.8,
  "synthetic_data_weight": 0.2
}

# More domain knowledge (50/50)
{
  "hybrid_mode": true,
  "real_data_weight": 0.5,
  "synthetic_data_weight": 0.5
}
```

## Verification

The models report their data breakdown:
```json
{
  "metrics": {
    "compound_classifier_accuracy": 0.8543,
    "data_breakdown": {
      "real": 750,
      "synthetic": 250
    },
    "real_samples": 750,
    "synthetic_samples": 250
  }
}
```

## Conclusion

The hybrid approach ensures:
✅ **Real learning** from actual F1 data when available
✅ **Robust performance** even with limited data
✅ **Domain expertise** guides the model correctly
✅ **Production-ready** models that work in real scenarios

**Bottom line**: These ARE real ML models that learn patterns, but they're guided by F1 expertise to handle data limitations gracefully.
