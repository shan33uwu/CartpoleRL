import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Zap } from 'lucide-react';
import { CartPoleEnv } from './services/cartPole';
import { PolicyGradientAgent } from './services/agent';
import CartPoleCanvas from './components/CartPoleCanvas';
import NetworkVisualizer from './components/NetworkVisualizer';
import MetricsPanel from './components/MetricsPanel';
import SettingsPanel from './components/SettingsPanel';
import { TrainingMetrics, NeuralNetworkWeights, LayerActivations } from './types';

const App: React.FC = () => {
  // -- Refs for non-React state (performance) --
  const envRef = useRef(new CartPoleEnv());
  const agentRef = useRef(new PolicyGradientAgent());
  const reqRef = useRef<number | null>(null);
  const speedRef = useRef<number>(1); // 1x, 5x, etc.
  
  // Throttling refs
  const lastCanvasUpdateRef = useRef<number>(0);
  const lastVizUpdateRef = useRef<number>(0);

  // -- React State for UI --
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [metricsHistory, setMetricsHistory] = useState<TrainingMetrics[]>([]);
  const [currentStep, setCurrentStep] = useState(0); // Current episode duration
  
  // Agent Settings
  const [agentSettings, setAgentSettings] = useState({
    hiddenSize: 16,
    learningRate: 0.01,
    gamma: 0.99
  });

  // Visualizer State
  const [weights, setWeights] = useState<NeuralNetworkWeights>(agentRef.current.getWeights());
  const [activations, setActivations] = useState<LayerActivations>({
    input: [0,0,0,0], hidden: new Array(16).fill(0), output: [0.5, 0.5]
  });
  const [cartPoleState, setCartPoleState] = useState(envRef.current.state);
  
  // Stats
  const [episodeCount, setEpisodeCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);

  // -- Loop Logic --
  const step = useCallback(() => {
    const now = performance.now();
    const env = envRef.current;
    const agent = agentRef.current;

    // Run multiple physics steps per frame if speed > 1
    const isHighSpeed = speedRef.current > 1;
    const stepsPerFrame = speedRef.current === 1 ? 1 : (speedRef.current === 2 ? 5 : 20);

    let frameState = env.state;
    let frameDone = false;
    
    // Initialize with dummy data, will be overwritten in loop
    let frameActs: LayerActivations = { input: [], hidden: [], output: [] };

    for (let i = 0; i < stepsPerFrame; i++) {
        // 1. Agent predicts action
        const { action, activations: currActs } = agent.predict(env.state);
        frameActs = currActs;

        // 2. Env steps
        const { nextState, reward, done } = env.step(action);
        frameState = nextState;
        frameDone = done;

        // 3. Store memory
        agent.storeStep(currActs, action, reward);

        if (done) {
            const score = agent.episodeRewards.length;
            
            // Train immediately on episode end
            agent.train();
            
            // Update Stats
            setLastScore(score);
            setBestScore(prev => Math.max(prev, score));
            setEpisodeCount(prev => {
                const newCount = prev + 1;
                setMetricsHistory(h => {
                    const newEntry = {
                        episode: newCount,
                        score: score,
                        bestScore: Math.max(score, h.length > 0 ? h[h.length-1].bestScore : 0),
                        avgScore: h.length === 0 ? score : (h[h.length-1].avgScore * 0.9 + score * 0.1)
                    };
                    return [...h, newEntry];
                });
                return newCount;
            });

            // Reset Env
            env.reset();
            setCurrentStep(0);
            
            // If we finished an episode inside the speed loop, we break to render the reset state
            break; 
        } else {
            setCurrentStep(prev => prev + 1);
        }
    }

    // UI Updates - Throttled
    
    // Adjust throttle rates based on speed to save CPU
    const canvasThrottle = isHighSpeed ? 60 : 30; // ~16fps vs ~33fps
    const vizThrottle = isHighSpeed ? 500 : 100;  // 2fps vs 10fps

    // Canvas: Target ~30 FPS (33ms) for performance, or instant if episode done (reset)
    if (frameDone || now - lastCanvasUpdateRef.current > canvasThrottle) {
        setCartPoleState(frameState);
        lastCanvasUpdateRef.current = now;
    }

    // Network Visualizer: Target ~10 FPS (100ms) as SVG is heavy
    if (frameDone || now - lastVizUpdateRef.current > vizThrottle) {
        if (frameActs.input && frameActs.input.length > 0) {
            setActivations(frameActs);
        }
        lastVizUpdateRef.current = now;
    }

    // Update weights visualization only occasionally or when training happens (which is end of episode)
    if (frameDone) {
         setWeights(agent.getWeights());
    }

    if (isRunning) {
        reqRef.current = requestAnimationFrame(step);
    }
  }, [isRunning]); // Removed activations from dependency to prevent re-creation of callback

  // -- Effects --
  
  // Handle Start/Stop
  useEffect(() => {
    if (isRunning) {
        reqRef.current = requestAnimationFrame(step);
    } else {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
    return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isRunning, step]);

  // Speed handler
  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 2 : (speed === 2 ? 3 : 1);
    setSpeed(nextSpeed);
    speedRef.current = nextSpeed;
  };

  const handleReset = () => {
    setIsRunning(false);
    // Re-initialize agent with current settings
    agentRef.current = new PolicyGradientAgent({
        hiddenSize: agentSettings.hiddenSize,
        learningRate: agentSettings.learningRate,
        gamma: agentSettings.gamma
    });

    envRef.current.reset();
    envRef.current.reset(); // ensure clear state
    setWeights(agentRef.current.getWeights());
    setActivations({
        input: [0,0,0,0], 
        hidden: new Array(agentSettings.hiddenSize).fill(0), 
        output: [0.5, 0.5]
    });
    setMetricsHistory([]);
    setEpisodeCount(0);
    setBestScore(0);
    setLastScore(0);
    setCurrentStep(0);
    setCartPoleState(envRef.current.state);
  };

  const handleSettingsChange = (newSettings: typeof agentSettings) => {
    const oldSettings = agentSettings;
    setAgentSettings(newSettings);
    
    // If hidden size changed, we must reset the agent entirely (new structure)
    if (newSettings.hiddenSize !== oldSettings.hiddenSize) {
        setIsRunning(false);
        agentRef.current = new PolicyGradientAgent({
            hiddenSize: newSettings.hiddenSize,
            learningRate: newSettings.learningRate,
            gamma: newSettings.gamma
        });
        
        // Full reset of environment and stats
        envRef.current.reset();
        setWeights(agentRef.current.getWeights());
        setActivations({
            input: [0,0,0,0], 
            hidden: new Array(newSettings.hiddenSize).fill(0), 
            output: [0.5, 0.5]
        });
        setMetricsHistory([]);
        setEpisodeCount(0);
        setBestScore(0);
        setLastScore(0);
        setCurrentStep(0);
        setCartPoleState(envRef.current.state);
    } else {
        // Just update parameters
        agentRef.current.learningRate = newSettings.learningRate;
        agentRef.current.gamma = newSettings.gamma;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white leading-none">CartPole RL</h1>
                <p className="text-xs text-slate-400 mt-1">Vanilla Policy Gradient (REINFORCE)</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        isRunning 
                        ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                        : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
                    }`}
                >
                    {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Train</>}
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button 
                    onClick={toggleSpeed}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700 text-slate-300"
                    title="Simulation Speed"
                >
                    <FastForward size={18} />
                    <span className="text-sm font-mono">{speed === 1 ? '1x' : (speed === 2 ? '5x' : '20x')}</span>
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-500/10 text-red-400 hover:text-red-300"
                    title="Reset Agent"
                >
                    <RotateCcw size={18} />
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: Viz & Physics (7 cols) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2">
            
            {/* CartPole Simulation */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-1 shadow-xl relative group">
                <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 text-xs font-mono text-slate-400">
                    Step: <span className="text-white">{currentStep}</span>
                </div>
                <CartPoleCanvas state={cartPoleState} width={800} height={400} />
            </div>

            {/* Neural Network Viz */}
            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col min-h-[300px]">
                <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Policy Network Live Activations
                </h2>
                <div className="flex-1 flex items-center justify-center bg-slate-950/50 rounded-lg border border-slate-800/50">
                    <NetworkVisualizer 
                        weights={weights} 
                        activations={activations} 
                        width={600} 
                        height={280} 
                    />
                </div>
                <div className="flex justify-between mt-3 px-4 text-xs text-slate-500 font-mono">
                    <span>Input Layer (4)</span>
                    <span>Hidden Layer ({agentSettings.hiddenSize} - Tanh)</span>
                    <span>Output (Softmax)</span>
                </div>
            </div>
        </div>

        {/* Right Column: Metrics (5 cols) */}
        <div className="col-span-12 lg:col-span-5 h-full overflow-hidden flex flex-col">
            
            {/* Settings Panel */}
            <SettingsPanel settings={agentSettings} onSave={handleSettingsChange} />

            <MetricsPanel 
                history={metricsHistory}
                currentEpisode={episodeCount}
                currentScore={lastScore}
                bestScore={bestScore}
            />
            
            {/* Info / Logs */}
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-400">
                <h3 className="font-semibold text-slate-200 mb-2">How it works</h3>
                <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
                    <li>Agent observes state: <code className="bg-slate-800 px-1 rounded">x, x_dot, theta, theta_dot</code></li>
                    <li>Network outputs probability of pushing <span className="text-indigo-400">Left</span> or <span className="text-indigo-400">Right</span>.</li>
                    <li><strong>Training:</strong> Uses Policy Gradient (REINFORCE).</li>
                    <li>It collects trajectories (states, actions, rewards).</li>
                    <li>At end of episode, it reinforces actions that led to high rewards.</li>
                    <li><strong className="text-emerald-400">Goal:</strong> Survive for as many steps as possible.</li>
                </ul>
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;