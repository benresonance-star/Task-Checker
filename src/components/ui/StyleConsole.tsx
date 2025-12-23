import React, { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal, RotateCcw, Palette, Maximize2, Minimize2, Camera, Trash2, Check } from 'lucide-react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';

interface StyleConsoleProps {
  onClose: () => void;
}

export const StyleConsole: React.FC<StyleConsoleProps> = ({ onClose }) => {
  const { 
    themeSettings, 
    themePresets,
    updateThemeSettings, 
    resetThemeSettings,
    saveThemePreset,
    deleteThemePreset,
    applyThemePreset
  } = useTasklistStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>();
  const consoleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault(); // Prevent text selection
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        
        requestRef.current = requestAnimationFrame(() => {
          setPosition({
            x: e.clientX - dragStartPos.current.x,
            y: e.clientY - dragStartPos.current.y
          });
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDragging]);

  const handleChange = (key: keyof typeof themeSettings, value: string | number) => {
    updateThemeSettings({ [key]: value });
  };

  return (
    <div
      ref={consoleRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        left: 0,
        top: 0,
      }}
      className={clsx(
        "z-[1000] border-2 border-google-blue rounded-container shadow-2xl flex flex-col overflow-hidden",
        isDragging ? "" : "transition-all duration-200",
        isMinimized 
          ? "w-64 h-12 bg-google-blue" 
          : "w-80 h-[650px] bg-white dark:bg-[#1e1e1e]"
      )}
    >
      {/* Header / Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className={clsx(
          "drag-handle flex items-center justify-between p-3 cursor-move bg-google-blue text-white shrink-0",
          !isMinimized && "border-b border-gray-200 dark:border-gray-700"
        )}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Branding Console</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" /> }
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Colors Section */}
          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Core Branding</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorControl 
                label="Primary Blue" 
                value={themeSettings.brandBlue} 
                onChange={(v) => handleChange('brandBlue', v)} 
              />
              <ColorControl 
                label="Action Green" 
                value={themeSettings.brandGreenLight} 
                onChange={(v) => handleChange('brandGreenLight', v)} 
              />
              <ColorControl 
                label="Success Green" 
                value={themeSettings.brandGreen} 
                onChange={(v) => handleChange('brandGreen', v)} 
              />
              <ColorControl 
                label="Danger Red" 
                value={themeSettings.brandRed} 
                onChange={(v) => handleChange('brandRed', v)} 
              />
              <ColorControl 
                label="Warning Gold" 
                value={themeSettings.brandYellow} 
                onChange={(v) => handleChange('brandYellow', v)} 
              />
            </div>
          </section>

          {/* Radii Section */}
          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Geometry (Corners)</h3>
            <div className="space-y-4">
              <SliderControl 
                label="Card Roundness" 
                value={themeSettings.radiusCard} 
                min={0} max={40} 
                onChange={(v) => handleChange('radiusCard', v)} 
              />
              <SliderControl 
                label="Button Roundness" 
                value={themeSettings.radiusButton} 
                min={0} max={20} 
                onChange={(v) => handleChange('radiusButton', v)} 
              />
              <SliderControl 
                label="Modal Roundness" 
                value={themeSettings.radiusContainer} 
                min={0} max={60} 
                onChange={(v) => handleChange('radiusContainer', v)} 
              />
            </div>
          </section>

          {/* Snapshots Section */}
          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Style Snapshots</h3>
            
            {/* Save New Preset */}
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Name (e.g. Happy Mode)"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-[10px] font-bold"
              />
              <button
                disabled={!newPresetName.trim()}
                onClick={() => {
                  saveThemePreset(newPresetName);
                  setNewPresetName('');
                }}
                className="w-10 h-10 flex items-center justify-center bg-google-blue text-white rounded-lg disabled:opacity-50 transition-all hover:shadow-md active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {themePresets.map(preset => (
                <div 
                  key={preset.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-google-blue/30 transition-all group"
                >
                  <div className="flex flex-col min-w-0 flex-1 cursor-pointer" onClick={() => applyThemePreset(preset.id)}>
                    <span className="text-[10px] font-black truncate">{preset.name}</span>
                    <div className="flex gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.brandBlue }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.brandGreenLight }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.brandYellow }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => applyThemePreset(preset.id)}
                      className="p-1.5 hover:bg-google-blue/10 text-google-blue rounded-md transition-colors"
                      title="Apply Preset"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => deleteThemePreset(preset.id)}
                      className="p-1.5 hover:bg-google-red/10 text-google-red rounded-md transition-colors"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {themePresets.length === 0 && (
                <p className="text-[9px] text-center text-gray-500 italic py-2">No snapshots saved yet.</p>
              )}
            </div>
          </section>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center gap-2">
            <button
              onClick={resetThemeSettings}
              className="flex-1 h-10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-black/40 text-gray-500 hover:bg-gray-200 dark:hover:bg-black/60 rounded-xl transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <div className="absolute bottom-1 right-1 cursor-nwse-resize text-gray-300 dark:text-gray-700">
          <GripHorizontal className="w-4 h-4 rotate-45" />
        </div>
      )}
    </div>
  );
};

const ColorControl: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black uppercase text-gray-500 tracking-tight">{label}</label>
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 flex-shrink-0">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div 
          style={{ backgroundColor: value }}
          className="w-full h-full rounded-md border border-gray-600 shadow-sm"
        />
      </div>
      <input 
        type="text" 
        value={value.toUpperCase()} 
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-[10px] font-mono"
      />
    </div>
  </div>
);

const SliderControl: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <label className="text-[9px] font-black uppercase text-gray-500 tracking-tight">{label}</label>
      <span className="text-[10px] font-mono text-google-blue">{value}px</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-google-blue"
    />
  </div>
);

