import React from 'react';
import { 
  LayoutGrid, 
  Target, 
  Search,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScratchpadWidget } from './ScratchpadWidget';

interface PlannerHomeProps {
  onOpenFocus: () => void;
  projects: any[];
  masters: any[];
}

export const PlannerHome: React.FC<PlannerHomeProps> = ({ 
  onOpenFocus, 
  projects,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-black/20 p-8 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-google-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform group-hover:scale-110 duration-1000" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Ready to <span className="text-google-blue">Orient?</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-md leading-relaxed">
            Organize your session and review your projects without the stress of the clock.
          </p>
        </div>
        <Button 
          onClick={onOpenFocus}
          className="relative z-10 h-16 px-8 rounded-2xl bg-google-blue text-white shadow-2xl shadow-google-blue/20 hover:scale-105 transition-all group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <div className="flex items-center gap-3 relative z-10">
            <TrendingUp className="w-6 h-6" />
            <span className="text-lg font-black uppercase tracking-wider">Begin Work Session</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Pulse Widget */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-3 text-sm font-black uppercase text-gray-500 tracking-[0.2em]">
              <Target className="w-5 h-5 text-google-green" />
              Project Pulse
            </h2>
            <Button variant="ghost" size="sm" className="text-xs font-black text-google-blue">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map(project => (
              <div 
                key={project.id}
                className="bg-white dark:bg-black/40 p-6 rounded-container border-2 border-gray-100 dark:border-gray-800 hover:border-google-green/50 transition-all cursor-pointer group shadow-sm hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-google-green/60">Project</span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 line-clamp-1">{project.name}</h3>
                  </div>
                  <div className="p-2 bg-google-green/10 rounded-xl text-google-green group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {project.instanceIds?.length || 0} Checklists
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Active Now
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-black/10 rounded-container border-2 border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active projects</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Sidebar */}
        <div className="space-y-6">
          <div className="bg-google-blue/5 dark:bg-blue-900/10 p-6 rounded-container border-2 border-google-blue/10 space-y-6">
            <h2 className="text-sm font-black uppercase text-google-blue tracking-[0.2em]">Quick Access</h2>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800">
                <Search className="w-4 h-4" /> Search Global Logic
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800">
                <LayoutGrid className="w-4 h-4" /> Browse Templates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width My Notes */}
      <div className="space-y-4">
        <div className="p-8 bg-white dark:bg-black/40 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 min-h-[500px] shadow-xl">
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
};

