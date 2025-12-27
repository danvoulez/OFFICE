
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const styles = {
    info: "bg-blue-50 text-blue-600 border-blue-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    neutral: "bg-slate-50 text-slate-500 border-slate-100"
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${styles[variant]}`}>
      {children}
    </span>
  );
};

export default Badge;
