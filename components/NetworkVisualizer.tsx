import React, { useMemo } from 'react';
import { NeuralNetworkWeights, LayerActivations } from '../types';

interface Props {
  weights: NeuralNetworkWeights;
  activations: LayerActivations;
  width?: number;
  height?: number;
}

const NetworkVisualizer: React.FC<Props> = ({ weights, activations, width = 400, height = 250 }) => {
  // Constants
  const layerGap = width / 3;
  const nodeRadius = 6;
  const startX = 40;
  const startY = 30;
  const availableHeight = height - 60;

  // Helper to normalize opacity for visualization
  const getOpacity = (val: number) => Math.min(Math.abs(val) * 0.8, 1);
  const getColor = (val: number) => (val > 0 ? '#3b82f6' : '#ef4444'); // Blue vs Red

  // Calculate node positions
  const layers = useMemo(() => {
    const ls = [
        { name: 'Input', size: 4, acts: activations.input },
        { name: 'Hidden', size: 16, acts: activations.hidden },
        { name: 'Output', size: 2, acts: activations.output },
    ];

    return ls.map((l, lIdx) => {
        const spacing = availableHeight / (l.size - 1 || 1);
        const x = startX + lIdx * layerGap;
        // Center vertically if few nodes, otherwise spread
        const totalH = (l.size - 1) * spacing;
        const offsetY = (height - totalH) / 2;
        
        return {
            ...l,
            nodes: Array.from({ length: l.size }).map((_, nIdx) => ({
                x,
                y: l.size === 1 ? height/2 : offsetY + nIdx * spacing,
                val: l.acts[nIdx] || 0
            }))
        };
    });
  }, [activations, width, height, availableHeight, layerGap]);

  return (
    <svg width={width} height={height} className="bg-slate-900 rounded-lg border border-slate-800 shadow-inner w-full h-auto">
      {/* Connections: Input -> Hidden */}
      <g>
        {layers[0].nodes.map((src, i) => 
            layers[1].nodes.map((dst, j) => {
                const w = weights.w1[i][j];
                return (
                    <line 
                        key={`l1-${i}-${j}`}
                        x1={src.x} y1={src.y}
                        x2={dst.x} y2={dst.y}
                        stroke={getColor(w)}
                        strokeWidth={1}
                        strokeOpacity={getOpacity(w)}
                    />
                )
            })
        )}
      </g>

      {/* Connections: Hidden -> Output */}
      <g>
        {layers[1].nodes.map((src, i) => 
            layers[2].nodes.map((dst, j) => {
                const w = weights.w2[i][j];
                return (
                    <line 
                        key={`l2-${i}-${j}`}
                        x1={src.x} y1={src.y}
                        x2={dst.x} y2={dst.y}
                        stroke={getColor(w)}
                        strokeWidth={1}
                        strokeOpacity={getOpacity(w)}
                    />
                )
            })
        )}
      </g>

      {/* Nodes */}
      {layers.map((layer, lIdx) => (
          <g key={lIdx}>
              {layer.nodes.map((node, nIdx) => (
                  <g key={`${lIdx}-${nIdx}`}>
                    <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r={nodeRadius}
                        fill={lIdx === 0 ? '#94a3b8' : (lIdx === 2 ? (nIdx===0 ? '#f87171' : '#3b82f6') : '#e2e8f0')} // Inputs gray, hidden white, output Red/Blue
                        fillOpacity={0.3 + Math.min(Math.abs(node.val), 1) * 0.7} // Light up on activation
                        stroke="#1e293b"
                        strokeWidth={1}
                    />
                    {/* Labels for Inputs/Outputs */}
                    {lIdx === 0 && nIdx === 0 && <text x={node.x - 10} y={node.y} fill="#64748b" fontSize="9" textAnchor="end" dy="3">x</text>}
                    {lIdx === 0 && nIdx === 1 && <text x={node.x - 10} y={node.y} fill="#64748b" fontSize="9" textAnchor="end" dy="3">x'</text>}
                    {lIdx === 0 && nIdx === 2 && <text x={node.x - 10} y={node.y} fill="#64748b" fontSize="9" textAnchor="end" dy="3">θ</text>}
                    {lIdx === 0 && nIdx === 3 && <text x={node.x - 10} y={node.y} fill="#64748b" fontSize="9" textAnchor="end" dy="3">θ'</text>}
                    
                    {lIdx === 2 && nIdx === 0 && <text x={node.x + 10} y={node.y} fill="#ef4444" fontSize="9" textAnchor="start" dy="3">L</text>}
                    {lIdx === 2 && nIdx === 1 && <text x={node.x + 10} y={node.y} fill="#3b82f6" fontSize="9" textAnchor="start" dy="3">R</text>}
                  </g>
              ))}
          </g>
      ))}
    </svg>
  );
};

export default NetworkVisualizer;
