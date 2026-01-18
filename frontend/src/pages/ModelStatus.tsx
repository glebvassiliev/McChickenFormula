import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, CheckCircle, AlertTriangle, Play, 
  BarChart3, Layers, Zap, Brain
} from 'lucide-react';
import clsx from 'clsx';

interface ModelInfo {
  name: string;
  status: string;
  description: string;
  ready: boolean;
  features?: string[];
  outputs?: string[];
}

export default function ModelStatus() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelDetails, setModelDetails] = useState<any>(null);
  const [training, setTraining] = useState<string | null>(null);
  const [trainingResults, setTrainingResults] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchModelStatus();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetch(`/api/models/${selectedModel}/info`)
        .then(res => res.json())
        .then(setModelDetails)
        .catch(console.error);
    }
  }, [selectedModel]);

  const fetchModelStatus = () => {
    fetch('/api/models/status')
      .then(res => res.json())
      .then(data => setModels(data.models || []))
      .catch(console.error);
  };

  const trainModel = async (modelName: string) => {
    setTraining(modelName);
    try {
      // Train with hybrid approach (will fetch historical data if available)
      const response = await fetch(`/api/models/train/${modelName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hybrid_mode: true,
          real_data_weight: 0.7,
          synthetic_data_weight: 0.3
        })
      });
      const result = await response.json();
      setTrainingResults(prev => ({ ...prev, [modelName]: result }));
      fetchModelStatus();
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setTraining(null);
    }
  };

  const trainAllModels = async () => {
    setTraining('all');
    try {
      // Train all with hybrid approach
      const response = await fetch('/api/models/train-all?hybrid_mode=true&real_data_weight=0.7', { 
        method: 'POST' 
      });
      const result = await response.json();
      setTrainingResults(result.results || {});
      fetchModelStatus();
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setTraining(null);
    }
  };

  const getModelIcon = (name: string) => {
    switch (name) {
      case 'tire_strategy': return '🔴';
      case 'pit_stop': return '⚡';
      case 'race_pace': return '📈';
      case 'position': return '🏁';
      default: return '🧠';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-racing text-2xl flex items-center gap-3">
            <Cpu className="w-8 h-8 text-racing-red" />
            ML MODELS
          </h1>
          <p className="text-gray-400 mt-1">Train and manage strategy prediction models</p>
        </div>
        <button
          onClick={trainAllModels}
          disabled={training !== null}
          className="btn-primary flex items-center gap-2"
        >
          {training === 'all' ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Training All...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Train All Models
            </>
          )}
        </button>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-2 gap-6">
        {models.map((model, i) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={clsx(
              'card p-6 cursor-pointer transition-all',
              selectedModel === model.name
                ? 'border-racing-red ring-2 ring-racing-red/30'
                : 'hover:border-white/30'
            )}
            onClick={() => setSelectedModel(model.name)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getModelIcon(model.name)}</span>
                <div>
                  <h3 className="font-racing text-lg capitalize">
                    {model.name.replace('_', ' ')}
                  </h3>
                  <p className="text-xs text-gray-400">{model.description}</p>
                </div>
              </div>
              {model.ready ? (
                <CheckCircle className="w-6 h-6 text-timing-green" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-tire-medium" />
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mb-4">
              <span className={clsx(
                'px-3 py-1 rounded-full text-xs font-semibold',
                model.ready 
                  ? 'bg-timing-green/20 text-timing-green' 
                  : 'bg-tire-medium/20 text-tire-medium'
              )}>
                {model.status.toUpperCase()}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  trainModel(model.name);
                }}
                disabled={training !== null}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  training === model.name
                    ? 'bg-racing-red text-white'
                    : 'bg-carbon hover:bg-carbon-light border border-white/10'
                )}
              >
                {training === model.name ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Train
                  </>
                )}
              </button>
            </div>

            {/* Training Results */}
            {trainingResults[model.name] && (
              <div className="p-3 bg-timing-green/10 border border-timing-green/30 rounded-lg">
                <p className="text-xs font-semibold text-timing-green mb-2">Training Complete!</p>
                
                {/* Data Breakdown */}
                {trainingResults[model.name].data_info?.data_breakdown && (
                  <div className="mb-2 p-2 bg-carbon/50 rounded text-xs">
                    <p className="text-gray-400 mb-1">Data Sources:</p>
                    <div className="flex gap-2">
                      <span className="text-timing-green">
                        {trainingResults[model.name].data_info.data_breakdown.real || 0} real
                      </span>
                      <span className="text-gray-500">+</span>
                      <span className="text-tire-medium">
                        {trainingResults[model.name].data_info.data_breakdown.synthetic || 0} synthetic
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(trainingResults[model.name].metrics || {}).map(([key, value]) => {
                    // Skip data_breakdown (already shown above)
                    if (key === 'data_breakdown') return null;
                    return (
                      <div key={key}>
                        <span className="text-gray-400">{key.replace('_', ' ')}: </span>
                        <span className="font-mono">
                          {typeof value === 'number' ? (value as number).toFixed(4) : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Model Details */}
      {selectedModel && modelDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-racing-red" />
            MODEL DETAILS: {selectedModel.replace('_', ' ').toUpperCase()}
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Input Features
              </h3>
              <ul className="space-y-1">
                {modelDetails.features?.map((feature: string, i: number) => (
                  <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Outputs */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-timing-green" />
                Outputs
              </h3>
              <ul className="space-y-1">
                {modelDetails.outputs?.map((output: string, i: number) => (
                  <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-timing-green rounded-full" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Card */}
      <div className="card p-6 bg-carbon/30">
        <h3 className="font-racing text-sm mb-3">ABOUT MODEL TRAINING</h3>
        <div className="grid grid-cols-3 gap-6 text-sm text-gray-400">
          <div>
            <p className="font-semibold text-white mb-1">Data Source</p>
            <p>Models can be trained on real historical F1 data or synthetic data for demonstration.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">Algorithms</p>
            <p>Uses Random Forest, Gradient Boosting, and XGBoost for optimal predictions.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">Persistence</p>
            <p>Trained models are saved to disk and automatically loaded on startup.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
