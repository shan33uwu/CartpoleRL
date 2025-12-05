import { CartPoleState, CARTPOLE_THRESHOLDS } from '../types';

export class CartPoleEnv {
  gravity = 9.8;
  massCart = 1.0;
  massPole = 0.1;
  totalMass = 1.1;
  length = 0.5; // actually half the pole's length
  poleMassLength = 0.05; // massPole * length
  forceMag = 10.0;
  tau = 0.02; // seconds between state updates

  state: CartPoleState;

  constructor() {
    this.state = this.reset();
  }

  reset(): CartPoleState {
    // Start with slight random perturbation
    this.state = {
      x: Math.random() * 0.05 - 0.025,
      xDot: Math.random() * 0.05 - 0.025,
      theta: Math.random() * 0.05 - 0.025,
      thetaDot: Math.random() * 0.05 - 0.025,
    };
    return { ...this.state };
  }

  step(action: number): { nextState: CartPoleState; reward: number; done: boolean } {
    const { x, xDot, theta, thetaDot } = this.state;
    const force = action === 1 ? this.forceMag : -this.forceMag;

    const costheta = Math.cos(theta);
    const sintheta = Math.sin(theta);

    const temp = (force + this.poleMassLength * thetaDot * thetaDot * sintheta) / this.totalMass;
    const thetaAcc =
      (this.gravity * sintheta - costheta * temp) /
      (this.length * (4.0 / 3.0 - (this.massPole * costheta * costheta) / this.totalMass));
    const xAcc = temp - (this.poleMassLength * thetaAcc * costheta) / this.totalMass;

    // Euler integration
    const nextX = x + this.tau * xDot;
    const nextXDot = xDot + this.tau * xAcc;
    const nextTheta = theta + this.tau * thetaDot;
    const nextThetaDot = thetaDot + this.tau * thetaAcc;

    this.state = {
      x: nextX,
      xDot: nextXDot,
      theta: nextTheta,
      thetaDot: nextThetaDot,
    };

    const done =
      nextX < -CARTPOLE_THRESHOLDS.x ||
      nextX > CARTPOLE_THRESHOLDS.x ||
      nextTheta < -CARTPOLE_THRESHOLDS.theta ||
      nextTheta > CARTPOLE_THRESHOLDS.theta;

    // Reward is 1 for every step taken including the termination step
    return { nextState: { ...this.state }, reward: 1, done };
  }
}
