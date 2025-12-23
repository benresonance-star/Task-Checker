import React, { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal, RotateCcw, Palette, Maximize2, Minimize2, Camera, Trash2, Check, Save } from 'lucide-react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';

interface StyleConsoleProps {
  onClose: () => void;
}

export const StyleConsole: React.FC<StyleConsoleProps> = ({ onClose }) => {
  const { 
    themeSettings, 
    themePresets,
    activePresetId,
    updateThemeSettings, 
    resetThemeSettings,
    saveThemePreset,
    updateThemePreset,
    deleteThemePreset,
    applyThemePreset
  } = useTasklistStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 320, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>();
  const consoleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartSize.current = { width: size.width, height: size.height };
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
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
      } else if (isResizing) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => {
          const deltaX = e.clientX - resizeStartPos.current.x;
          const deltaY = e.clientY - resizeStartPos.current.y;
          setSize({
            width: Math.max(280, resizeStartSize.current.width + deltaX),
            height: Math.max(200, resizeStartSize.current.height + deltaY)
          });
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    if (isDragging || isResizing) {
      document.body.style.cursor = isDragging ? 'grabbing' : 'nwse-resize';
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
  }, [isDragging, isResizing]);

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
        width: isMinimized ? '256px' : `${size.width}px`,
        height: isMinimized ? '48px' : `${size.height}px`,
      }}
      className={clsx(
        "z-[1000] border-2 border-google-blue rounded-container shadow-2xl flex flex-col overflow-hidden",
        (isDragging || isResizing) ? "" : "transition-all duration-200",
        isMinimized 
          ? "bg-google-blue" 
          : "bg-white dark:bg-[#1e1e1e]"
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
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">IDENTITY & NAVIGATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorControl 
                label="Application Brand Identity" 
                value={themeSettings.colorAppIdentity} 
                onChange={(v) => handleChange('colorAppIdentity', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">TASK EXECUTION</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorControl 
                label="Task Done Button Highlight" 
                value={themeSettings.colorActiveTaskDone} 
                onChange={(v) => handleChange('colorActiveTaskDone', v)} 
              />
              <ColorControl 
                label="Completed Task Background" 
                value={themeSettings.colorCompletedState} 
                onChange={(v) => handleChange('colorCompletedState', v)} 
              />
            </div>
            <div className="space-y-4">
              <SliderControl 
                label="Checklist Task Container Radius" 
                value={themeSettings.radiusTaskCard} 
                min={0} max={40} 
                onChange={(v) => handleChange('radiusTaskCard', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">TEAM & STATUS</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorControl 
                label="Team Presence & Indicators" 
                value={themeSettings.colorPresenceNotice} 
                onChange={(v) => handleChange('colorPresenceNotice', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">DASHBOARD & WORKSPACE</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorControl 
                label="Project Info Container Background" 
                value={themeSettings.colorProjectInfoBg} 
                onChange={(v) => handleChange('colorProjectInfoBg', v)} 
              />
              <ColorControl 
                label="Project Info Container Outline" 
                value={themeSettings.colorProjectInfoBorder} 
                onChange={(v) => handleChange('colorProjectInfoBorder', v)} 
              />
              <ColorControl 
                label="Active Checklist Background" 
                value={themeSettings.colorChecklistBg} 
                onChange={(v) => handleChange('colorChecklistBg', v)} 
              />
              <ColorControl 
                label="Active Checklist Outline" 
                value={themeSettings.colorChecklistBorder} 
                onChange={(v) => handleChange('colorChecklistBorder', v)} 
              />
              <ColorControl 
                label="Project Info Card Background" 
                value={themeSettings.colorMetadataCardBg} 
                onChange={(v) => handleChange('colorMetadataCardBg', v)} 
              />
              <ColorControl 
                label="Project Info Card Outline" 
                value={themeSettings.colorMetadataCardBorder} 
                onChange={(v) => handleChange('colorMetadataCardBorder', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">DASHBOARD SECTIONS</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorControl 
                label="Identification Header Color" 
                value={themeSettings.colorSectionIdent} 
                onChange={(v) => handleChange('colorSectionIdent', v)} 
              />
              <ColorControl 
                label="Identification Icon Color" 
                value={themeSettings.colorSectionIdentIcon} 
                onChange={(v) => handleChange('colorSectionIdentIcon', v)} 
              />
              <ColorControl 
                label="Planning Header Color" 
                value={themeSettings.colorSectionPlan} 
                onChange={(v) => handleChange('colorSectionPlan', v)} 
              />
              <ColorControl 
                label="Planning Icon Color" 
                value={themeSettings.colorSectionPlanIcon} 
                onChange={(v) => handleChange('colorSectionPlanIcon', v)} 
              />
              <ColorControl 
                label="Building Header Color" 
                value={themeSettings.colorSectionBuild} 
                onChange={(v) => handleChange('colorSectionBuild', v)} 
              />
              <ColorControl 
                label="Building Icon Color" 
                value={themeSettings.colorSectionBuildIcon} 
                onChange={(v) => handleChange('colorSectionBuildIcon', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">HIERARCHY & CONNECTORS</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorControl 
                label="Hierarchical Connector Lines" 
                value={themeSettings.colorHierarchyLine} 
                onChange={(v) => handleChange('colorHierarchyLine', v)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">SYSTEM CONTROLS</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorControl 
                label="Destructive Action Alerts" 
                value={themeSettings.colorDestructive} 
                onChange={(v) => handleChange('colorDestructive', v)} 
              />
            </div>
            <div className="space-y-4">
              <SliderControl 
                label="Interactive Button Corners" 
                value={themeSettings.radiusInteractive} 
                min={0} max={20} 
                onChange={(v) => handleChange('radiusInteractive', v)} 
              />
              <SliderControl 
                label="Major Modal & UI Corners" 
                value={themeSettings.radiusMajorModal} 
                min={0} max={60} 
                onChange={(v) => handleChange('radiusMajorModal', v)} 
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
              {themePresets.map(preset => {
                const isActive = activePresetId === preset.id;
                
                return (
                  <div 
                    key={preset.id}
                    className={clsx(
                      "flex items-center justify-between p-2 rounded-lg border transition-all group",
                      isActive 
                        ? "bg-google-blue/10 border-google-blue shadow-sm" 
                        : "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-gray-800 hover:border-google-blue/30"
                    )}
                  >
                    <div className="flex flex-col min-w-0 flex-1 cursor-pointer" onClick={() => applyThemePreset(preset.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black truncate">{preset.name}</span>
                        {isActive && <div className="w-1 h-1 rounded-full bg-google-blue animate-pulse" />}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.colorAppIdentity }} />
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.colorActiveTaskDone }} />
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.settings.colorPresenceNotice }} />
                      </div>
                    </div>
                    <div className={clsx(
                      "flex items-center gap-1 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {isActive && (
                        <button 
                          onClick={() => updateThemePreset(preset.id)}
                          className="p-1.5 hover:bg-google-green/10 text-google-green rounded-md transition-colors"
                          title="Update Snapshot with Current Settings"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isActive && (
                        <button 
                          onClick={() => applyThemePreset(preset.id)}
                          className="p-1.5 hover:bg-google-blue/10 text-google-blue rounded-md transition-colors"
                          title="Apply Preset"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteThemePreset(preset.id)}
                        className="p-1.5 hover:bg-google-red/10 text-google-red rounded-md transition-colors"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
        <div 
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-1 right-1 cursor-nwse-resize text-gray-300 dark:text-gray-700 hover:text-google-blue transition-colors"
        >
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

