import React, { useEffect, useRef } from 'react';
import { CartPoleState, CARTPOLE_THRESHOLDS } from '../types';

interface Props {
  state: CartPoleState;
  width?: number;
  height?: number;
}

const CartPoleCanvas: React.FC<Props> = ({ state, width = 400, height = 250 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Scaling
    const scale = width / (2 * CARTPOLE_THRESHOLDS.x + 1); // fits typical range
    const centerX = width / 2;
    const centerY = height * 0.7; // Ground level
    
    const cartWidth = 50;
    const cartHeight = 30;
    const poleLength = 100; // Visual length

    // Draw Ground
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 2;
    ctx.stroke();

    // Calculate Cart Position
    // State x is in meters. 
    const cartX = centerX + state.x * scale;

    // Draw Cart
    ctx.fillStyle = '#3b82f6'; // blue-500
    ctx.fillRect(cartX - cartWidth / 2, centerY - cartHeight / 2, cartWidth, cartHeight);

    // Draw Pole
    const poleEndX = cartX + Math.sin(state.theta) * poleLength;
    const poleEndY = centerY - Math.cos(state.theta) * poleLength;

    ctx.beginPath();
    ctx.moveTo(cartX, centerY);
    ctx.lineTo(poleEndX, poleEndY);
    ctx.strokeStyle = '#f87171'; // red-400
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Axle
    ctx.beginPath();
    ctx.arc(cartX, centerY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.fill();

    // Limit markers
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.setLineDash([5, 5]);
    const leftLimit = centerX - CARTPOLE_THRESHOLDS.x * scale;
    const rightLimit = centerX + CARTPOLE_THRESHOLDS.x * scale;
    
    // Use Math.min/max to ensure drawing within bounds if x blows up
    if (leftLimit > 0) {
       ctx.beginPath();
       ctx.moveTo(leftLimit, centerY - 20);
       ctx.lineTo(leftLimit, centerY + 20);
       ctx.stroke();
    }
    if (rightLimit < width) {
       ctx.beginPath();
       ctx.moveTo(rightLimit, centerY - 20);
       ctx.lineTo(rightLimit, centerY + 20);
       ctx.stroke();
    }
    ctx.setLineDash([]);

  }, [state, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="bg-slate-900 rounded-lg border border-slate-800 shadow-inner w-full h-auto"
    />
  );
};

export default CartPoleCanvas;
