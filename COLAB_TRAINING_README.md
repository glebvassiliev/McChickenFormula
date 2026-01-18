# Training F1 Strategy ML Models in Google Colab

This guide explains how to train all 4 ML models using Google Colab.

## Quick Start

1. **Open Google Colab**: Go to https://colab.research.google.com/

2. **Upload the Notebook**: 
   - Click "File" > "Upload notebook"
   - Upload `train_models_colab.ipynb`

3. **Run All Cells**: 
   - Click "Runtime" > "Run all" OR run each cell sequentially

4. **Download Models**: 
   - After training completes, download the generated `.joblib` files
   - Place them in your `backend/models/` directory

## Models Trained

1. **Tire Strategy Model** (`tire_strategy_model.joblib`)
   - Predicts optimal tire compound
   - Estimates stint lengths
   - Calculates degradation rates

2. **Pit Stop Predictor** (`pit_stop_model.joblib`)
   - Identifies pit windows
   - Detects undercut opportunities
   - Predicts optimal pit lap

3. **Race Pace Analyzer** (`race_pace_model.joblib`)
   - Predicts lap times
   - Models fuel effects
   - Analyzes pace trends

4. **Position Predictor** (`position_model.joblib`)
   - Predicts overtaking opportunities
   - Forecasts position changes
   - Analyzes battle situations

## Hybrid Data Approach

The notebook uses a **hybrid training approach** that combines:

1. **Real OpenF1 Data** (70% weight by default): 
   - Actual tire compounds used in races
   - Real pit stop timings
   - Actual lap times and degradation patterns
   - Weather conditions from actual sessions

2. **Domain Knowledge/Synthetic Data** (30% weight):
   - F1 strategy principles and rules
   - Realistic patterns when real data is limited
   - Ensures models work even with sparse data

**Why Hybrid?**
- Real F1 data is limited (only 2023-2024 available)
- Not all sessions have complete telemetry
- Domain knowledge fills gaps and improves robustness
- Models learn real patterns while being guided by F1 expertise

## After Training

1. **Download the models** from Colab
2. **Place in backend/models/**:
   ```
   backend/models/
   ├── tire_strategy_model.joblib
   ├── pit_stop_model.joblib
   ├── race_pace_model.joblib
   └── position_model.joblib
   ```
3. **Restart your backend server** - models will be loaded automatically!

## Troubleshooting

- **Not enough data**: The notebook uses synthetic data if OpenF1 data is insufficient
- **Training takes time**: Training all 4 models may take 5-10 minutes
- **Download issues**: Make sure to download all `.joblib` files before closing Colab

## Tips

- Use Colab's GPU runtime for faster training (Runtime > Change runtime type > GPU)
- Adjust the number of sessions fetched if you want more/fewer training samples
- Models are saved after each training step, so you can download individually
