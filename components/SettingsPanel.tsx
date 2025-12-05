import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, Save } from 'lucide-react';

interface Settings {
  hiddenSize: number;
  learningRate: number;
  gamma: number;
}

interface Props {
  settings: Settings;
  onSave: (newSettings: Settings) => void;
}

const SettingsPanel: React.FC<Props> = ({ settings, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key: keyof Settings, value: number) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localSettings);
    setHasChanges(false);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden mb-6 transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Sliders size={16} />
            <span>Hyperparameters</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-5 border-t border-slate-800">
            {/* Hidden Size */}
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                    Hidden Layer Size (Nodes)
                </label>
                <div className="flex gap-2">
                    {[8, 16, 32, 64].map(size => (
                        <button
                            key={size}
                            onClick={() => handleChange('hiddenSize', size)}
                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                                localSettings.hiddenSize === size
                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                    Note: Changing this resets the agent progress.
                </p>
            </div>

            {/* Learning Rate */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-medium text-slate-400">Learning Rate</label>
                    <span className="text-xs font-mono text-indigo-400">{localSettings.learningRate.toFixed(3)}</span>
                </div>
                <input 
                    type="range" 
                    min="0.001" 
                    max="0.1" 
                    step="0.001"
                    value={localSettings.learningRate}
                    onChange={(e) => handleChange('learningRate', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>

            {/* Gamma */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-medium text-slate-400">Discount Factor (Gamma)</label>
                    <span className="text-xs font-mono text-indigo-400">{localSettings.gamma.toFixed(3)}</span>
                </div>
                <input 
                    type="range" 
                    min="0.90" 
                    max="0.999" 
                    step="0.001"
                    value={localSettings.gamma}
                    onChange={(e) => handleChange('gamma', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>

            {/* Apply Button */}
            <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    hasChanges
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
                <Save size={16} />
                Apply Changes
            </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;