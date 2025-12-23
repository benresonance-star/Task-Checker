export const theme = {
  colors: {
    google: {
      blue: '#4285F4',
      red: '#EA4335',
      yellow: '#FBBC05',
      green: '#34A853',
      greenLight: '#5DB975',
    },
    background: {
      light: 'bg-white',
      dark: 'dark:bg-[#1a1a1a]',
      sidebar: 'bg-gray-50 dark:bg-[#121212]',
    },
  },
  components: {
    taskDoneButton: {
      base: 'flex-1 h-12 rounded-xl font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.3)] active:scale-95 active:shadow-inner border',
      active: 'bg-google-green-light text-white border-white/20 hover:animate-pulse-gold',
      completed: 'bg-white text-google-green border-white animate-pulse',
      multiUser: 'bg-google-red text-white border-white/30 hover:animate-pulse-gold',
      multiUserCompleted: 'bg-white text-google-red border-white',
      yellowState: 'bg-google-yellow text-gray-900 border-white/30 hover:animate-pulse-gold',
      yellowStateCompleted: 'bg-white text-google-yellow border-white animate-pulse',
    },
    sidebar: {
      activeTask: 'group rounded-card border-2 cursor-pointer relative flex flex-col transition-all',
      activeTaskMulti: 'bg-google-red border-google-red text-white shadow-2xl scale-[1.05] z-20 animate-pulse',
      activeTaskFocus: 'bg-google-green border-google-green text-white shadow-lg scale-[1.02] z-10',
      activeTaskYellow: 'bg-google-yellow border-google-yellow text-gray-900 shadow-lg scale-[1.02] z-10',
      inactiveTask: 'bg-google-blue/5 dark:bg-google-blue/10 border-google-blue dark:border-google-blue hover:border-google-blue min-h-[64px]',
      deactivatedCompleted: 'bg-google-green/10 border-google-green/20 text-google-green dark:text-google-green/80 shadow-sm min-h-[64px]',
    },
    checklist: {
      container: 'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 sm:py-2.5 px-3 sm:px-4 rounded-card group transition-all border shadow-sm hover:shadow-md cursor-pointer relative',
      containerActive: 'bg-gray-100 border-google-green dark:bg-black/60 dark:border-google-green ring-4 ring-google-green/30 shadow-lg',
      containerMulti: 'bg-google-red border-google-red text-white shadow-2xl scale-[1.02] z-20 animate-pulse',
      containerInactive: 'bg-white border-blue-200 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 dark:border-gray-800',
      badge: 'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border transition-all',
      badgeActive: 'bg-google-yellow border-google-yellow text-gray-900 shadow-sm',
      badgeInactive: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/10',
    },
    pomodoro: {
      container: 'flex-1 h-10 flex items-center justify-center px-1.5 py-1 rounded-xl transition-all shadow-sm min-w-0 bg-white/10',
      button: 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm bg-white/20 border-white/30 text-white',
      buttonYellow: 'bg-black/10 border-black/20 text-gray-900',
    },
  },
  animations: {
    pulseGold: 'animate-pulse-gold',
  }
};
