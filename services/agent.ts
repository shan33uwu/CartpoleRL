import { CartPoleState, NeuralNetworkWeights, LayerActivations } from '../types';
import { randomMatrix, zeroVector, tanh, softmax } from './math';

export class PolicyGradientAgent {
  inputSize = 4;
  hiddenSize = 16;
  outputSize = 2;
  learningRate = 0.01; // Increased slightly for faster visible convergence in demo
  gamma = 0.99; // Discount factor

  // Weights
  w1: number[][]; // [input][hidden]
  b1: number[];   // [hidden]
  w2: number[][]; // [hidden][output]
  b2: number[];   // [output]

  // Episode memory
  episodeStates: number[][] = [];
  episodeHiddens: number[][] = [];
  episodeProbs: number[][] = [];
  episodeActions: number[] = [];
  episodeRewards: number[] = [];

  constructor(config: { hiddenSize?: number; learningRate?: number; gamma?: number } = {}) {
    this.hiddenSize = config.hiddenSize ?? 16;
    this.learningRate = config.learningRate ?? 0.01;
    this.gamma = config.gamma ?? 0.99;

    this.w1 = randomMatrix(this.inputSize, this.hiddenSize);
    this.b1 = zeroVector(this.hiddenSize);
    this.w2 = randomMatrix(this.hiddenSize, this.outputSize);
    this.b2 = zeroVector(this.outputSize);
  }

  resetMemory() {
    this.episodeStates = [];
    this.episodeHiddens = [];
    this.episodeProbs = [];
    this.episodeActions = [];
    this.episodeRewards = [];
  }

  // Forward pass
  predict(state: CartPoleState): { action: number; activations: LayerActivations } {
    const x = [state.x, state.xDot, state.theta, state.thetaDot];
    
    // Hidden layer (Tanh)
    const hidden = this.b1.map((b, hIdx) => {
      let sum = b;
      for (let i = 0; i < this.inputSize; i++) {
        sum += x[i] * this.w1[i][hIdx];
      }
      return tanh(sum);
    });

    // Output layer (Logits -> Softmax)
    const logits = this.b2.map((b, oIdx) => {
      let sum = b;
      for (let h = 0; h < this.hiddenSize; h++) {
        sum += hidden[h] * this.w2[h][oIdx];
      }
      return sum;
    });

    const probs = softmax(logits);

    // Sample action based on probability
    const action = Math.random() < probs[0] ? 0 : 1;

    return {
      action,
      activations: {
        input: x,
        hidden,
        output: probs
      }
    };
  }

  storeStep(activations: LayerActivations, action: number, reward: number) {
    this.episodeStates.push(activations.input);
    this.episodeHiddens.push(activations.hidden);
    this.episodeProbs.push(activations.output);
    this.episodeActions.push(action);
    this.episodeRewards.push(reward);
  }

  train() {
    const N = this.episodeRewards.length;
    
    // Compute discounted returns
    const returns = new Array(N).fill(0);
    let runningAdd = 0;
    for (let t = N - 1; t >= 0; t--) {
      runningAdd = runningAdd * this.gamma + this.episodeRewards[t];
      returns[t] = runningAdd;
    }

    // Normalize returns (optional but helps stability)
    const mean = returns.reduce((a, b) => a + b, 0) / N;
    const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / N) || 1;
    const normReturns = returns.map(r => (r - mean) / std);

    // Gradients initialization
    const dW2 = this.w2.map(row => row.map(() => 0));
    const db2 = this.b2.map(() => 0);
    const dW1 = this.w1.map(row => row.map(() => 0));
    const db1 = this.b1.map(() => 0);

    for (let t = 0; t < N; t++) {
      const prob = this.episodeProbs[t];
      const action = this.episodeActions[t];
      const hidden = this.episodeHiddens[t];
      const input = this.episodeStates[t];
      const adv = normReturns[t];

      // Gradient of Cross Entropy loss w.r.t logits
      // grad_logits = prob - (1 if action else 0), but for PG we weight by return
      // Actually: grad_log_prob = (1 - prob) if action taken, (-prob) if not.
      // We want to maximize Reward, so we move in direction of grad * Return.
      
      // Vectorized: dL_dLogit = prob - y_true where y_true is one-hot action
      // But we weight by Advantage (-adv since we usually minimize loss, here maximize reward)
      // dLoss/dLogit = (prob - action_one_hot) * (-adv)
      
      const dLogits = [0, 0];
      dLogits[0] = (prob[0] - (action === 0 ? 1 : 0)); // * -adv is applied in update
      dLogits[1] = (prob[1] - (action === 1 ? 1 : 0)); 

      // Backprop to W2, b2
      for (let o = 0; o < this.outputSize; o++) {
        // We want to minimize Loss, Loss ~ -Reward. So we subtract gradient * Adv
        // Actually standard formulation: theta += alpha * grad(log_pi) * R
        // grad(log_pi) = (1 - p) if taken.
        // Let's stick to: dLogit = (p - y)
        // Update = -lr * dLogit * (-Adv) = lr * dLogit * Adv
        
        // Wait, if we use Negative Log Likelihood weighted by return:
        // Loss = - sum( log(p_action) * R )
        // dLoss/dLogit = p - 1 (if action). 
        // Update rule: param -= lr * gradient
        // param -= lr * (p-1) * R
        
        const gradTerm = dLogits[o] * adv; // (p - y) * R
        
        db2[o] += gradTerm;
        for (let h = 0; h < this.hiddenSize; h++) {
          dW2[h][o] += hidden[h] * gradTerm;
        }
      }

      // Backprop to Hidden (Tanh derivative is 1 - h^2)
      const dHidden = new Array(this.hiddenSize).fill(0);
      for (let h = 0; h < this.hiddenSize; h++) {
        let sum = 0;
        for (let o = 0; o < this.outputSize; o++) {
          sum += dLogits[o] * adv * this.w2[h][o];
        }
        dHidden[h] = sum * (1 - hidden[h] * hidden[h]);
      }

      // Backprop to W1, b1
      for (let h = 0; h < this.hiddenSize; h++) {
        db1[h] += dHidden[h];
        for (let i = 0; i < this.inputSize; i++) {
          dW1[i][h] += input[i] * dHidden[h];
        }
      }
    }

    // Apply gradients
    // We used (p-y)*R as the gradient of the "Loss". We want to minimize Loss.
    for (let i = 0; i < this.inputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        this.w1[i][j] -= this.learningRate * dW1[i][j];
      }
    }
    for (let i = 0; i < this.hiddenSize; i++) {
      this.b1[i] -= this.learningRate * db1[i];
    }
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.outputSize; j++) {
        this.w2[i][j] -= this.learningRate * dW2[i][j];
      }
    }
    for (let i = 0; i < this.outputSize; i++) {
      this.b2[i] -= this.learningRate * db2[i];
    }

    this.resetMemory();
  }

  getWeights(): NeuralNetworkWeights {
    return {
      w1: this.w1,
      b1: this.b1,
      w2: this.w2,
      b2: this.b2
    };
  }
}