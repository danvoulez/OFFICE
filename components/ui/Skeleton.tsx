
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const base = "animate-pulse bg-slate-200/60";
  const variants = {
    text: "h-3 w-full rounded",
    rect: "h-20 w-full rounded-xl",
    circle: "h-10 w-10 rounded-full"
  };

  return <div className={`${base} ${variants[variant]} ${className}`} />;
};

export default Skeleton;
