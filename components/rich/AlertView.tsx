
import React from 'react';

interface AlertViewProps {
  title: string;
  description: string;
  priority: 'warning' | 'info' | 'success';
}

const AlertView: React.FC<AlertViewProps> = ({ title, description, priority }) => {
  const styles = {
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-950',
      icon: 'fa-triangle-exclamation',
      accent: 'bg-amber-500'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-950',
      icon: 'fa-circle-info',
      accent: 'bg-blue-500'
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-950',
      icon: 'fa-circle-check',
      accent: 'bg-emerald-500'
    }
  };

  const config = styles[priority] || styles.info;

  return (
    <div className={`mt-5 p-6 rounded-3xl border-2 ${config.bg} ${config.border} shadow-sm animate-fade-in relative overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${config.accent}`}></div>
      <div className="flex items-start">
        <div className={`w-10 h-10 rounded-xl ${config.accent} bg-opacity-10 flex items-center justify-center ${config.text} shrink-0 mr-4`}>
          <i className={`fas ${config.icon} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 opacity-60 ${config.text}`}>
            Priority Broadcast
          </h4>
          <h3 className={`text-sm font-black mb-1 ${config.text} tracking-tight`}>{title}</h3>
          <p className={`text-[13px] leading-relaxed font-medium opacity-80 ${config.text}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlertView;
