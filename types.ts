export interface CartPoleState {
  x: number;
  xDot: number;
  theta: number;
  thetaDot: number;
}

export interface TrainingMetrics {
  episode: number;
  score: number;
  bestScore: number;
  avgScore: number;
}

export interface LayerActivations {
  input: number[];
  hidden: number[];
  output: number[];
}

export interface NeuralNetworkWeights {
  w1: number[][]; // Input -> Hidden
  b1: number[];
  w2: number[][]; // Hidden -> Output
  b2: number[];
}

export const CARTPOLE_THRESHOLDS = {
  x: 2.4,
  theta: 12 * (Math.PI / 180), // 12 degrees in radians
};
