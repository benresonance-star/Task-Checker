import React, { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal, RotateCcw, Palette, Maximize2, Minimize2, Camera, Trash2, Check, Save, ChevronDown, ChevronRight, LayoutGrid, ClipboardList, Settings, Briefcase, Info, Music, Copy, Edit2 } from 'lucide-react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';
import { ThemeSettings } from '../../types';

interface StyleConsoleProps {
  onClose: () => void;
}

export const StyleConsole: React.FC<StyleConsoleProps> = ({ onClose }) => {
  const { 
    themeSettingsLight,
    themeSettingsDark,
    themePresets,
    activePresetIdLight,
    activePresetIdDark,
    isDarkMode,
    toggleDarkMode,
    updateThemeSettings, 
    previewThemeSettings,
    resetThemeSettings,
    saveThemePreset,
    updateThemePreset,
    deleteThemePreset,
    applyThemePreset,
    renameThemePreset,
    duplicateThemePreset
  } = useTasklistStore();
  
  const themeSettings = isDarkMode ? themeSettingsDark : themeSettingsLight;
  const activePresetId = isDarkMode ? activePresetIdDark : activePresetIdLight;
  
  const activeLightPreset = themePresets.find(p => p.id === activePresetIdLight);
  const activeDarkPreset = themePresets.find(p => p.id === activePresetIdDark);

  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 320, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  
  // Duplication/Rename State
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [duplicatingPresetId, setDuplicatingPresetId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true,
    atmosphere: false,
    planner: false,
    dashboard: false,
    projects: false,
    checklist: false,
    modal: false,
    radii: false
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTheme = (targetMode: 'light' | 'dark') => {
    toggleDarkMode(targetMode === 'dark');
  };

  const isModified = (presetId: string | null, currentSettings: any) => {
    if (!presetId) return false;
    const preset = themePresets.find(p => p.id === presetId);
    if (!preset) return false;
    return JSON.stringify(preset.settings) !== JSON.stringify(currentSettings);
  };

  const lightModified = isModified(activePresetIdLight, themeSettingsLight);
  const darkModified = isModified(activePresetIdDark, themeSettingsDark);
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

  const handleChange = (key: keyof ThemeSettings, value: string | number) => {
    previewThemeSettings({ [key]: value });
  };

  const SectionHeader: React.FC<{ id: string; label: string; icon: any }> = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => toggleSection(id)}
      className="w-full flex items-start justify-between py-2 px-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors rounded-lg group"
    >
      <div className="flex items-start gap-2 text-left">
        <Icon className="w-3.5 h-3.5 text-google-blue mt-0.5 shrink-0" />
        <span className="text-sm font-black uppercase text-gray-500 tracking-widest group-hover:text-google-blue transition-colors leading-tight">{label}</span>
      </div>
      {expandedSections[id] ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />}
    </button>
  );

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
        backgroundColor: 'var(--console-bg)',
      }}
      className={clsx(
        "z-[3000] border-2 border-google-blue rounded-container shadow-2xl flex flex-col overflow-hidden",
        (isDragging || isResizing) ? "" : "transition-all duration-200",
        isMinimized && "bg-google-blue"
      )}
      onClick={(e) => e.stopPropagation()}
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
          <span className="text-sm font-black uppercase tracking-widest">Branding Console</span>
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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          {/* Dual-Status Mode Switcher */}
          <section className="bg-gray-50 dark:bg-black/40 p-2 rounded-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Global Workspace Context</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => toggleTheme('light')}
                className={clsx(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
                  !isDarkMode 
                    ? "bg-white border-google-blue text-google-blue shadow-sm" 
                    : "bg-transparent border-transparent text-gray-400 hover:bg-white/5"
                )}
              >
                <span className="text-sm font-black uppercase">Light Mode</span>
                <span className="text-xs font-bold truncate max-w-full px-1">
                  {activeLightPreset?.name || 'System Default'}
                  {lightModified && <span className="ml-1 text-orange-500">*</span>}
                </span>
              </button>
              <button 
                onClick={() => toggleTheme('dark')}
                className={clsx(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
                  isDarkMode 
                    ? "bg-gray-800 border-google-blue text-white shadow-sm" 
                    : "bg-transparent border-transparent text-gray-400 hover:bg-black/5"
                )}
              >
                <span className="text-sm font-black uppercase">Dark Mode</span>
                <span className="text-xs font-bold truncate max-w-full px-1">
                  {activeDarkPreset?.name || 'System Default'}
                  {darkModified && <span className="ml-1 text-orange-500">*</span>}
                </span>
              </button>
            </div>
          </section>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-[-1rem]" />

          {/* Snapshots Section (Always prominent) */}
          <section className="space-y-3">
            <SectionHeader id="presets" label="Style Snapshots" icon={Camera} />
            {expandedSections.presets && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={`Name ${isDarkMode ? 'Dark' : 'Light'} Style...`}
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                  <button
                    disabled={!newPresetName.trim()}
                    onClick={() => {
                      saveThemePreset(newPresetName);
                      setNewPresetName('');
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-google-blue text-white rounded-lg disabled:opacity-50 transition-all hover:shadow-md active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {themePresets.filter(p => p.mode === (isDarkMode ? 'dark' : 'light')).map((preset, _, currentModePresets) => {
                    const isActive = activePresetId === preset.id;
                    const isEditing = editingPresetId === preset.id;
                    const canDelete = currentModePresets.length > 1;

                    return (
                      <div key={preset.id} className={clsx(
                        "flex flex-col p-2 rounded-lg border transition-all group",
                        isActive ? "bg-google-blue/10 border-google-blue shadow-sm" : "bg-gray-50 dark:bg-black/40 border-gray-100 dark:border-gray-800 hover:border-google-blue/30"
                      )}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex-1 min-w-0" onClick={() => !isEditing && applyThemePreset(preset.id)}>
                            <div className="flex items-center">
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingPresetName}
                                  onChange={(e) => setEditingPresetName(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && editingPresetName.trim()) {
                                      renameThemePreset(preset.id, editingPresetName);
                                      setEditingPresetId(null);
                                    }
                                    if (e.key === 'Escape') setEditingPresetId(null);
                                  }}
                                  onBlur={() => setEditingPresetId(null)}
                                  className="w-full bg-white dark:bg-black/40 border border-google-blue rounded px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-google-blue outline-none"
                                />
                              ) : (
                                <div className="flex items-center gap-2 min-w-0 cursor-pointer">
                                  <span className="text-sm font-black truncate">{preset.name}</span>
                                  {isActive && <div className="w-1 h-1 rounded-full bg-google-blue animate-pulse shrink-0" />}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={clsx("flex items-center gap-1 shrink-0", (isActive || isEditing) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                            {isEditing ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (editingPresetName.trim()) {
                                    renameThemePreset(preset.id, editingPresetName);
                                    setEditingPresetId(null);
                                  }
                                }} 
                                className="p-1.5 hover:bg-google-green/10 text-google-green rounded-md"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPresetId(preset.id);
                                    setEditingPresetName(preset.name);
                                  }} 
                                  className="p-1.5 hover:bg-google-blue/10 text-google-blue rounded-md"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDuplicatingPresetId(preset.id);
                                    setDuplicateName(`${preset.name} Copy`);
                                  }} 
                                  className="p-1.5 hover:bg-google-blue/10 text-google-blue rounded-md"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {isActive && (
                                  <button onClick={() => updateThemePreset(preset.id)} className="p-1.5 hover:bg-google-green/10 text-google-green rounded-md" title="Overwrite Snapshot"><Save className="w-3.5 h-3.5" /></button>
                                )}
                                {!isActive && (
                                  <button onClick={() => applyThemePreset(preset.id)} className="p-1.5 hover:bg-google-blue/10 text-google-blue rounded-md" title="Apply Snapshot"><Check className="w-3.5 h-3.5" /></button>
                                )}
                                <button 
                                  disabled={!canDelete}
                                  onClick={() => setDeletingPresetId(preset.id)} 
                                  className="p-1.5 hover:bg-google-red/10 text-google-red rounded-md disabled:opacity-30 disabled:cursor-not-allowed" 
                                  title={canDelete ? "Delete Snapshot" : "At least one style required"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 1. Global App & Identity */}
          <section className="space-y-3">
            <SectionHeader id="atmosphere" label="Atmosphere & Identity" icon={Palette} />
            {expandedSections.atmosphere && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Brand Identity" value={themeSettings.colorAppIdentity} onChange={(v) => handleChange('colorAppIdentity', v)} />
                  <ColorControl label="Main App Bg" value={themeSettings.colorAppBg} onChange={(v) => handleChange('colorAppBg', v)} />
                  <ColorControl label="Sidebar Bg" value={themeSettings.colorSidebarBg} onChange={(v) => handleChange('colorSidebarBg', v)} />
                  <ColorControl label="Console Bg" value={themeSettings.colorConsoleBg} onChange={(v) => handleChange('colorConsoleBg', v)} />
                  <ColorControl label="Header Bg" value={themeSettings.colorHeaderBg} onChange={(v) => handleChange('colorHeaderBg', v)} />
                  <ColorControl label="Header Border" value={themeSettings.colorHeaderBorder} onChange={(v) => handleChange('colorHeaderBorder', v)} />
                  <ColorControl label="Alert: Danger" value={themeSettings.colorDestructive} onChange={(v) => handleChange('colorDestructive', v)} />
                  <ColorControl label="Alert: Warning" value={themeSettings.colorPresenceNotice} onChange={(v) => handleChange('colorPresenceNotice', v)} />
                </div>
                
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Text Primary" value={themeSettings.colorTextPrimary} onChange={(v) => handleChange('colorTextPrimary', v)} />
                    <ColorControl label="Text Muted" value={themeSettings.colorTextSecondary} onChange={(v) => handleChange('colorTextSecondary', v)} />
                    <ColorControl label="Heading Color" value={themeSettings.colorTextHeading} onChange={(v) => handleChange('colorTextHeading', v)} />
                  </div>
                  <SliderControl label="Global Text Scale" value={themeSettings.fontSizeBase} min={10} max={24} onChange={(v) => handleChange('fontSizeBase', v)} />
                  
                  <div className="space-y-4 py-2 border-y border-gray-100 dark:border-gray-800">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Sticky Header Geometry</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <SliderControl label="Header Blur" value={themeSettings.headerBlur} min={0} max={40} onChange={(v) => handleChange('headerBlur', v)} />
                      <SliderControl label="Header Padding Top" value={themeSettings.headerPaddingTop} min={0} max={64} onChange={(v) => handleChange('headerPaddingTop', v)} />
                      <SliderControl label="Header Padding Bottom" value={themeSettings.headerPaddingBottom} min={0} max={64} onChange={(v) => handleChange('headerPaddingBottom', v)} />
                    </div>
                  </div>

                  <SliderControl label="Line Spacing" value={themeSettings.lineHeightBase} min={1} max={2} step={0.1} onChange={(v) => handleChange('lineHeightBase', v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <SliderControl label="Heading Kerning" value={themeSettings.letterSpacingHeading} min={-0.1} max={0.5} step={0.01} onChange={(v) => handleChange('letterSpacingHeading', v)} />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black uppercase text-gray-500 tracking-tight">Heading Weight</label>
                      <select 
                        value={themeSettings.fontWeightHeading} 
                        onChange={(e) => handleChange('fontWeightHeading', e.target.value)}
                        className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="400">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extrabold</option>
                        <option value="900">Black</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 1b. MISSION CONTROL (Pre-Flight) */}
          <section className="space-y-3">
            <SectionHeader id="planner" label="MISSION CONTROL (Pre-Flight)" icon={LayoutGrid} />
            {expandedSections.planner && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Today's Horizon</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Pulse Panel Bg" value={themeSettings.colorPlannerPulseBg} onChange={(v) => handleChange('colorPlannerPulseBg', v)} />
                    <ColorControl label="Pulse Border" value={themeSettings.colorPlannerPulseBorder} onChange={(v) => handleChange('colorPlannerPulseBorder', v)} />
                    <ColorControl label="Time/Date Text" value={themeSettings.colorPlannerPulseText} onChange={(v) => handleChange('colorPlannerPulseText', v)} />
                    <ColorControl label="Alert Bell" value={themeSettings.colorPlannerPulseAlertIcon} onChange={(v) => handleChange('colorPlannerPulseAlertIcon', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Strategic Spotlight</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Spotlight Bg" value={themeSettings.colorPlannerSpotlightBg} onChange={(v) => handleChange('colorPlannerSpotlightBg', v)} />
                    <ColorControl label="Spotlight Border" value={themeSettings.colorPlannerSpotlightBorder} onChange={(v) => handleChange('colorPlannerSpotlightBorder', v)} />
                    <ColorControl label="Identity Col Bg" value={themeSettings.colorPlannerSpotlightIdentityBg} onChange={(v) => handleChange('colorPlannerSpotlightIdentityBg', v)} />
                    <ColorControl label="Col Separator" value={themeSettings.colorPlannerSpotlightSeparator} onChange={(v) => handleChange('colorPlannerSpotlightSeparator', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Activity Tokens</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Active Token Bg" value={themeSettings.colorPlannerTokenActiveBg} onChange={(v) => handleChange('colorPlannerTokenActiveBg', v)} />
                    <ColorControl label="Active Token Text" value={themeSettings.colorPlannerTokenActiveText} onChange={(v) => handleChange('colorPlannerTokenActiveText', v)} />
                    <ColorControl label="Inactive Token Bg" value={themeSettings.colorPlannerTokenInactiveBg} onChange={(v) => handleChange('colorPlannerTokenInactiveBg', v)} />
                    <ColorControl label="Inactive Border" value={themeSettings.colorPlannerTokenInactiveBorder} onChange={(v) => handleChange('colorPlannerTokenInactiveBorder', v)} />
                    <ColorControl label="Inactive Text" value={themeSettings.colorPlannerTokenInactiveText} onChange={(v) => handleChange('colorPlannerTokenInactiveText', v)} />
                    <ColorControl label="Token Icon" value={themeSettings.colorPlannerTokenIcon} onChange={(v) => handleChange('colorPlannerTokenIcon', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Content Cards</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Card Background" value={themeSettings.colorPlannerCardBg} onChange={(v) => handleChange('colorPlannerCardBg', v)} />
                    <ColorControl label="Card Border" value={themeSettings.colorPlannerCardBorder} onChange={(v) => handleChange('colorPlannerCardBorder', v)} />
                    <ColorControl label="Card Text" value={themeSettings.colorPlannerCardText} onChange={(v) => handleChange('colorPlannerCardText', v)} />
                    <ColorControl label="Next Task Muted" value={themeSettings.colorPlannerNextTaskText} onChange={(v) => handleChange('colorPlannerNextTaskText', v)} />
                    <ColorControl label="Ring Base" value={themeSettings.colorPlannerProgressRingBase} onChange={(v) => handleChange('colorPlannerProgressRingBase', v)} />
                    <ColorControl label="Ring Fill" value={themeSettings.colorPlannerProgressRingFill} onChange={(v) => handleChange('colorPlannerProgressRingFill', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Time-Critical Alerts</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Alert Card Bg" value={themeSettings.colorPlannerAlertBg} onChange={(v) => handleChange('colorPlannerAlertBg', v)} />
                    <ColorControl label="Alert Card Border" value={themeSettings.colorPlannerAlertBorder} onChange={(v) => handleChange('colorPlannerAlertBorder', v)} />
                    <ColorControl label="Alert Icon" value={themeSettings.colorPlannerAlertIcon} onChange={(v) => handleChange('colorPlannerAlertIcon', v)} />
                    <ColorControl label="Alert Icon Bg" value={themeSettings.colorPlannerAlertIconBg} onChange={(v) => handleChange('colorPlannerAlertIconBg', v)} />
                    <ColorControl label="Alert Title" value={themeSettings.colorPlannerAlertTitle} onChange={(v) => handleChange('colorPlannerAlertTitle', v)} />
                    <ColorControl label="Alert Category" value={themeSettings.colorPlannerAlertCategory} onChange={(v) => handleChange('colorPlannerAlertCategory', v)} />
                    <ColorControl label="Alert Time Bg" value={themeSettings.colorPlannerAlertTimeBg} onChange={(v) => handleChange('colorPlannerAlertTimeBg', v)} />
                    <ColorControl label="Alert Time Text" value={themeSettings.colorPlannerAlertTimeText} onChange={(v) => handleChange('colorPlannerAlertTimeText', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest\">Mission Control: Staging</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Staged Border" value={themeSettings.colorPlannerStagedTaskBorder} onChange={(v) => handleChange('colorPlannerStagedTaskBorder', v)} />
                    <ColorControl label="Staged Text" value={themeSettings.colorPlannerStagedTaskText} onChange={(v) => handleChange('colorPlannerStagedTaskText', v)} />
                    <ColorControl label="Sprint Btn Bg" value={themeSettings.colorPlannerBeginSprintBg} onChange={(v) => handleChange('colorPlannerBeginSprintBg', v)} />
                    <ColorControl label="Sprint Btn Text" value={themeSettings.colorPlannerBeginSprintText} onChange={(v) => handleChange('colorPlannerBeginSprintText', v)} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 2. My Work Session (Focus & Workflow) */}
          <section className="space-y-3">
            <SectionHeader id="dashboard" label="My Work Session" icon={LayoutGrid} />
            {expandedSections.dashboard && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Task Done Highlight" value={themeSettings.colorActiveTaskDone} onChange={(v) => handleChange('colorActiveTaskDone', v)} />
                  <ColorControl label="Completion Pulse" value={themeSettings.colorActiveTaskPulse} onChange={(v) => handleChange('colorActiveTaskPulse', v)} />
                  <ColorControl label="In Focus Breathing" value={themeSettings.colorFocusPulse} onChange={(v) => handleChange('colorFocusPulse', v)} />
                  <ColorControl label="Zen Water Level" value={themeSettings.colorFocusWater} onChange={(v) => handleChange('colorFocusWater', v)} />
                  <ColorControl label="Inactive Hub Border" value={themeSettings.colorHubInactiveBorder} onChange={(v) => handleChange('colorHubInactiveBorder', v)} />
                  <ColorControl label="Hub Step 2 Inactive Bg" value={themeSettings.colorHubStep2InactiveBg} onChange={(v) => handleChange('colorHubStep2InactiveBg', v)} />
                </div>
                
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <SliderControl label="Completion Frequency" value={themeSettings.pulseFrequencyDone} min={0.1} max={10} step={0.1} onChange={(v) => handleChange('pulseFrequencyDone', v)} />
                  <SliderControl label="In Focus Frequency" value={themeSettings.pulseFrequencyFocus} min={0.1} max={10} step={0.1} onChange={(v) => handleChange('pulseFrequencyFocus', v)} />
                </div>
                
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">"Can I Proceed?" Styling</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Container Bg" value={themeSettings.colorPrereqBg} onChange={(v) => handleChange('colorPrereqBg', v)} />
                    <ColorControl label="Container Border" value={themeSettings.colorPrereqBorder} onChange={(v) => handleChange('colorPrereqBorder', v)} />
                    <ColorControl label="Item Background" value={themeSettings.colorPrereqItemBg} onChange={(v) => handleChange('colorPrereqItemBg', v)} />
                    <ColorControl label="Item Text" value={themeSettings.colorPrereqText} onChange={(v) => handleChange('colorPrereqText', v)} />
                    <ColorControl label="Icon Color" value={themeSettings.colorPrereqIcon} onChange={(v) => handleChange('colorPrereqIcon', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">My Notes & Workbench</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Widget Bg" value={themeSettings.colorNotesBg} onChange={(v) => handleChange('colorNotesBg', v)} />
                    <ColorControl label="Widget Outline" value={themeSettings.colorNotesBorder} onChange={(v) => handleChange('colorNotesBorder', v)} />
                    <ColorControl label="Editor Bg" value={themeSettings.colorNotesEditorBg} onChange={(v) => handleChange('colorNotesEditorBg', v)} />
                    <ColorControl label="Personal Note Bg" value={themeSettings.colorNotePersonalBg} onChange={(v) => handleChange('colorNotePersonalBg', v)} />
                    <ColorControl label="Project Note Bg" value={themeSettings.colorNoteProjectBg} onChange={(v) => handleChange('colorNoteProjectBg', v)} />
                    <ColorControl label="Priority Note Bg" value={themeSettings.colorNotePriorityBg} onChange={(v) => handleChange('colorNotePriorityBg', v)} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. Project Interface */}
          <section className="space-y-3">
            <SectionHeader id="projects" label="Project Interface" icon={Briefcase} />
            {expandedSections.projects && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Project Info Bg" value={themeSettings.colorProjectInfoBg} onChange={(v) => handleChange('colorProjectInfoBg', v)} />
                  <ColorControl label="Project Info Border" value={themeSettings.colorProjectInfoBorder} onChange={(v) => handleChange('colorProjectInfoBorder', v)} />
                  <ColorControl label="Metadata Card Bg" value={themeSettings.colorMetadataCardBg} onChange={(v) => handleChange('colorMetadataCardBg', v)} />
                  <ColorControl label="Metadata Card Border" value={themeSettings.colorMetadataCardBorder} onChange={(v) => handleChange('colorMetadataCardBorder', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <ColorControl label="Identification Header" value={themeSettings.colorSectionIdent} onChange={(v) => handleChange('colorSectionIdent', v)} />
                  <ColorControl label="Ident Icon" value={themeSettings.colorSectionIdentIcon} onChange={(v) => handleChange('colorSectionIdentIcon', v)} />
                  <ColorControl label="Planning Header" value={themeSettings.colorSectionPlan} onChange={(v) => handleChange('colorSectionPlan', v)} />
                  <ColorControl label="Planning Icon" value={themeSettings.colorSectionPlanIcon} onChange={(v) => handleChange('colorSectionPlanIcon', v)} />
                  <ColorControl label="Building Header" value={themeSettings.colorSectionBuild} onChange={(v) => handleChange('colorSectionBuild', v)} />
                  <ColorControl label="Building Icon" value={themeSettings.colorSectionBuildIcon} onChange={(v) => handleChange('colorSectionBuildIcon', v)} />
                </div>
              </div>
            )}
          </section>

            {/* 4. Checklist & Templates */}
          <section className="space-y-3">
            <SectionHeader id="checklist" label="Checklist & Templates" icon={ClipboardList} />
            {expandedSections.checklist && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Checklist Bg" value={themeSettings.colorChecklistBg} onChange={(v) => handleChange('colorChecklistBg', v)} />
                  <ColorControl label="Checklist Border" value={themeSettings.colorChecklistBorder} onChange={(v) => handleChange('colorChecklistBorder', v)} />
                  <ColorControl label="Checklist Title" value={themeSettings.colorChecklistTitle} onChange={(v) => handleChange('colorChecklistTitle', v)} />
                  <ColorControl label="Connector Line" value={themeSettings.colorHierarchyLine} onChange={(v) => handleChange('colorHierarchyLine', v)} />
                  <ColorControl label="Editor Border" value={themeSettings.colorNotesEditorBorder} onChange={(v) => handleChange('colorNotesEditorBorder', v)} />
                  <ColorControl label="Editor Divider" value={themeSettings.colorNotesEditorSeparator} onChange={(v) => handleChange('colorNotesEditorSeparator', v)} />
                </div>
                
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Section Styling</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Section Bg" value={themeSettings.colorSectionBg} onChange={(v) => handleChange('colorSectionBg', v)} />
                    <ColorControl label="Section Border" value={themeSettings.colorSectionBorder} onChange={(v) => handleChange('colorSectionBorder', v)} />
                    <ColorControl label="Section Title" value={themeSettings.colorSectionTitle} onChange={(v) => handleChange('colorSectionTitle', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Sub-section Styling</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Sub-section Bg" value={themeSettings.colorSubsectionBg} onChange={(v) => handleChange('colorSubsectionBg', v)} />
                    <ColorControl label="Sub-section Border" value={themeSettings.colorSubsectionBorder} onChange={(v) => handleChange('colorSubsectionBorder', v)} />
                    <ColorControl label="Sub-section Title" value={themeSettings.colorSubsectionTitle} onChange={(v) => handleChange('colorSubsectionTitle', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Task Styling</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Task Background" value={themeSettings.colorTaskBg} onChange={(v) => handleChange('colorTaskBg', v)} />
                    <ColorControl label="Active Task Bg" value={themeSettings.colorTaskActiveBg} onChange={(v) => handleChange('colorTaskActiveBg', v)} />
                    <ColorControl label="Task Title" value={themeSettings.colorTaskTitle} onChange={(v) => handleChange('colorTaskTitle', v)} />
                    <ColorControl label="Inactive Text" value={themeSettings.colorTaskInactiveText} onChange={(v) => handleChange('colorTaskInactiveText', v)} />
                    <ColorControl label="Completed State" value={themeSettings.colorCompletedState} onChange={(v) => handleChange('colorCompletedState', v)} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 5. Task Info Window (Modal) */}
          <section className="space-y-3">
            <SectionHeader id="modal" label="Task Info Window" icon={Info} />
            {expandedSections.modal && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Overlay Color" value={themeSettings.colorModalOverlay} onChange={(v) => handleChange('colorModalOverlay', v)} />
                  <ColorControl label="Window Background" value={themeSettings.colorModalBg} onChange={(v) => handleChange('colorModalBg', v)} />
                  <ColorControl label="Window Border" value={themeSettings.colorModalBorder} onChange={(v) => handleChange('colorModalBorder', v)} />
                  <ColorControl label="Close Button" value={themeSettings.colorModalCloseButton} onChange={(v) => handleChange('colorModalCloseButton', v)} />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Section & Content</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Section Bg" value={themeSettings.colorModalSectionBg} onChange={(v) => handleChange('colorModalSectionBg', v)} />
                    <ColorControl label="Prereq Section Bg" value={themeSettings.colorModalPrereqBg} onChange={(v) => handleChange('colorModalPrereqBg', v)} />
                    <ColorControl label="Section Border" value={themeSettings.colorModalSectionBorder} onChange={(v) => handleChange('colorModalSectionBorder', v)} />
                    <ColorControl label="Prereq Section Border" value={themeSettings.colorModalPrereqBorder} onChange={(v) => handleChange('colorModalPrereqBorder', v)} />
                    <ColorControl label="Section Title" value={themeSettings.colorModalSectionTitle} onChange={(v) => handleChange('colorModalSectionTitle', v)} />
                    <ColorControl label="Icon Color" value={themeSettings.colorModalIcon} onChange={(v) => handleChange('colorModalIcon', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Inputs & Radii</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Input Bg" value={themeSettings.colorModalInputBg} onChange={(v) => handleChange('colorModalInputBg', v)} />
                    <ColorControl label="Input Border" value={themeSettings.colorModalInputBorder} onChange={(v) => handleChange('colorModalInputBorder', v)} />
                  </div>
                  <SliderControl label="Section Radius" value={themeSettings.radiusModalSection} min={0} max={40} onChange={(v) => handleChange('radiusModalSection', v)} />
                  <SliderControl label="Input Radius" value={themeSettings.radiusModalInput} min={0} max={20} onChange={(v) => handleChange('radiusModalInput', v)} />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Buttons</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Primary Btn Bg" value={themeSettings.colorModalButtonPrimaryBg} onChange={(v) => handleChange('colorModalButtonPrimaryBg', v)} />
                    <ColorControl label="Primary Btn Text" value={themeSettings.colorModalButtonPrimaryText} onChange={(v) => handleChange('colorModalButtonPrimaryText', v)} />
                    <ColorControl label="Secondary Btn Bg" value={themeSettings.colorModalButtonSecondaryBg} onChange={(v) => handleChange('colorModalButtonSecondaryBg', v)} />
                    <ColorControl label="Secondary Btn Text" value={themeSettings.colorModalButtonSecondaryText} onChange={(v) => handleChange('colorModalButtonSecondaryText', v)} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. My Session Sidebar */}
          <section className="space-y-3">
            <SectionHeader id="session" label="My Session Sidebar" icon={Music} />
            {expandedSections.session && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <ColorControl label="Header Bg" value={themeSettings.colorSessionSidebarHeaderBg} onChange={(v) => handleChange('colorSessionSidebarHeaderBg', v)} />
                  <ColorControl label="Header Title" value={themeSettings.colorSessionSidebarHeaderTitle} onChange={(v) => handleChange('colorSessionSidebarHeaderTitle', v)} />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Task States</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Active Bg" value={themeSettings.colorSessionTaskActiveBg} onChange={(v) => handleChange('colorSessionTaskActiveBg', v)} />
                    <ColorControl label="Active Text" value={themeSettings.colorSessionTaskActiveText} onChange={(v) => handleChange('colorSessionTaskActiveText', v)} />
                    <ColorControl label="Active Border" value={themeSettings.colorSessionTaskActiveBorder} onChange={(v) => handleChange('colorSessionTaskActiveBorder', v)} />
                    <div className="hidden" />
                    <ColorControl label="Selected Bg" value={themeSettings.colorSessionTaskSelectedBg} onChange={(v) => handleChange('colorSessionTaskSelectedBg', v)} />
                    <ColorControl label="Selected Text" value={themeSettings.colorSessionTaskSelectedText} onChange={(v) => handleChange('colorSessionTaskSelectedText', v)} />
                    <ColorControl label="Selected Border" value={themeSettings.colorSessionTaskSelectedBorder} onChange={(v) => handleChange('colorSessionTaskSelectedBorder', v)} />
                    <div className="hidden" />
                    <ColorControl label="Inactive Bg" value={themeSettings.colorSessionTaskInactiveBg} onChange={(v) => handleChange('colorSessionTaskInactiveBg', v)} />
                    <ColorControl label="Inactive Text" value={themeSettings.colorSessionTaskInactiveText} onChange={(v) => handleChange('colorSessionTaskInactiveText', v)} />
                    <ColorControl label="Inactive Border" value={themeSettings.colorSessionTaskInactiveBorder} onChange={(v) => handleChange('colorSessionTaskInactiveBorder', v)} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest\">Queue & Ledger</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Queue Title" value={themeSettings.colorSessionQueueTitle} onChange={(v) => handleChange('colorSessionQueueTitle', v)} />
                    <ColorControl label="Ledger Bg" value={themeSettings.colorSessionLedgerBg} onChange={(v) => handleChange('colorSessionLedgerBg', v)} />
                    <ColorControl label="Ledger Text" value={themeSettings.colorSessionLedgerText} onChange={(v) => handleChange('colorSessionLedgerText', v)} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 7. Master Radii (System Corners) */}
          <section className="space-y-3">
            <SectionHeader id="radii" label="System Corner Radii" icon={Settings} />
            {expandedSections.radii && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                <SliderControl label="Checklist Section" value={themeSettings.radiusSection} min={0} max={60} onChange={(v) => handleChange('radiusSection', v)} />
                <SliderControl label="Checklist Sub-section" value={themeSettings.radiusSubsection} min={0} max={60} onChange={(v) => handleChange('radiusSubsection', v)} />
                <SliderControl label="Task Card" value={themeSettings.radiusTaskCard} min={0} max={40} onChange={(v) => handleChange('radiusTaskCard', v)} />
                <SliderControl label="Focus Card" value={themeSettings.radiusFocusCard} min={0} max={100} onChange={(v) => handleChange('radiusFocusCard', v)} />
                <SliderControl label="Widgets" value={themeSettings.radiusWidget} min={0} max={40} onChange={(v) => handleChange('radiusWidget', v)} />
                <SliderControl label="Sidebar" value={themeSettings.radiusSidebar} min={0} max={40} onChange={(v) => handleChange('radiusSidebar', v)} />
                <SliderControl label="Interactive Buttons" value={themeSettings.radiusInteractive} min={0} max={20} onChange={(v) => handleChange('radiusInteractive', v)} />
                <SliderControl label="Major Modals" value={themeSettings.radiusMajorModal} min={0} max={60} onChange={(v) => handleChange('radiusMajorModal', v)} />
                <SliderControl label="Project Dashboard" value={themeSettings.radiusProjectInfo} min={0} max={60} onChange={(v) => handleChange('radiusProjectInfo', v)} />
                <SliderControl label="Metadata Cards" value={themeSettings.radiusMetadataCard} min={0} max={40} onChange={(v) => handleChange('radiusMetadataCard', v)} />
                <SliderControl label="Task Actions" value={themeSettings.radiusTaskButton} min={0} max={20} onChange={(v) => handleChange('radiusTaskButton', v)} />
              </div>
            )}
          </section>

          {/* Footer Actions */}
          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={() => updateThemeSettings(themeSettings)}
              className="w-full h-10 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-google-blue text-white rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Workspace Default
            </button>
            <button
              onClick={() => resetThemeSettings()}
              className="w-full h-10 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-gray-100 dark:bg-black/40 text-gray-500 hover:bg-gray-200 dark:hover:bg-black/60 rounded-xl transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to System Defaults
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

      {/* Duplication Modal */}
      {duplicatingPresetId && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] border-2 border-google-blue shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-tight">Duplicate Style</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name your duplicate snapshot</p>
            </div>
            
            <input 
              autoFocus
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && duplicateName.trim()) {
                  duplicateThemePreset(duplicatingPresetId, duplicateName);
                  setDuplicatingPresetId(null);
                }
                if (e.key === 'Escape') setDuplicatingPresetId(null);
              }}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-google-blue outline-none"
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setDuplicatingPresetId(null)}
                className="flex-1 h-12 rounded-xl border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={!duplicateName.trim()}
                onClick={() => {
                  duplicateThemePreset(duplicatingPresetId, duplicateName);
                  setDuplicatingPresetId(null);
                }}
                className="flex-1 h-12 rounded-xl bg-google-blue text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPresetId && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] border-2 border-google-red shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-tight">Delete Style?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This action cannot be undone.</p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-center">
              <span className="text-sm font-black text-google-red">
                {themePresets.find(p => p.id === deletingPresetId)?.name}
              </span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setDeletingPresetId(null)}
                className="flex-1 h-12 rounded-xl border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteThemePreset(deletingPresetId);
                  setDeletingPresetId(null);
                }}
                className="flex-1 h-12 rounded-xl bg-google-red text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ColorControl: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const getHexValue = (val: string) => {
    if (val.startsWith('#')) return val;
    if (val.startsWith('rgba') || val.startsWith('rgb')) {
      const match = val.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
      }
    }
    return '#000000';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-black uppercase text-gray-500 tracking-tight">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="relative w-6 h-6 flex-shrink-0">
          <input 
            type="color" 
            value={getHexValue(value)} 
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            style={{ backgroundColor: value }}
            className="w-full h-full rounded border border-gray-400 dark:border-gray-600 shadow-sm"
          />
        </div>
        <input 
          type="text" 
          value={value.toUpperCase()} 
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded px-1.5 py-1 text-xs font-mono"
        />
      </div>
    </div>
  );
};

const SliderControl: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-black uppercase text-gray-500 tracking-tight">{label}</label>
      <span className="text-xs font-mono text-google-blue">{value}{step < 1 ? '' : 'px'}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-google-blue"
    />
  </div>
);

