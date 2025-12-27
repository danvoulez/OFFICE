
import React from 'react';
import { MessageStatus } from '../../types';

interface OptimisticIndicatorProps {
  status: MessageStatus;
}

const OptimisticIndicator: React.FC<OptimisticIndicatorProps> = ({ status }) => {
  const config = {
    pending: { icon: 'fa-circle-notch animate-spin', color: 'text-slate-300', label: 'Queued' },
    signed: { icon: 'fa-check', color: 'text-blue-400', label: 'Signed' },
    broadcasted: { icon: 'fa-check-double', color: 'text-emerald-500', label: 'Broadcasted' },
    failed: { icon: 'fa-triangle-exclamation', color: 'text-red-500', label: 'Failed' }
  };

  const current = config[status] || config.pending;

  return (
    <div className="flex items-center space-x-1.5 ml-3 opacity-60">
      <i className={`fas ${current.icon} ${current.color} text-[8px]`}></i>
      <span className={`text-[7px] font-black uppercase tracking-[0.1em] ${current.color}`}>
        {current.label}
      </span>
    </div>
  );
};

export default OptimisticIndicator;
