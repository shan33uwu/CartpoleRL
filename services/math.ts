export const gaussianRandom = (mean = 0, stdev = 1): number => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const tanh = (x: number): number => Math.tanh(x);

// Softmax for 1D array
export const softmax = (logits: number[]): number[] => {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
};

// Matrix initialization
export const randomMatrix = (rows: number, cols: number, scale = 0.1): number[][] => {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => gaussianRandom(0, scale))
  );
};

export const zeroVector = (length: number): number[] => new Array(length).fill(0);
