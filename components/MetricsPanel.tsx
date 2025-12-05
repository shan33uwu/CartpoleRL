import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrainingMetrics } from '../types';

interface Props {
  history: TrainingMetrics[];
  currentEpisode: number;
  currentScore: number;
  bestScore: number;
}

const MetricsPanel: React.FC<Props> = ({ history, currentEpisode, currentScore, bestScore }) => {
  // Only show last 50 episodes to keep chart readable and performant
  const recentHistory = history.slice(-50);

  return (
    <div className="flex flex-col h-full gap-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Episode</div>
                <div className="text-2xl font-bold text-slate-100">{currentEpisode}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Last Score</div>
                <div className="text-2xl font-bold text-emerald-400">{currentScore}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Best Score</div>
                <div className="text-2xl font-bold text-amber-400">{bestScore}</div>
            </div>
        </div>

        {/* Chart */}
        <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 min-h-[200px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Training Progress (Score per Episode)</h3>
            <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="episode" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                        itemStyle={{ color: '#f1f5f9' }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 4 }}
                        animationDuration={300}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                        dot={false} 
                        animationDuration={300}
                    />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default MetricsPanel;
