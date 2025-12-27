
import React from 'react';

interface AvatarProps {
  src: string;
  name: string;
  status?: 'online' | 'offline' | 'working' | 'typing';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAgent?: boolean;
  className?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, status, size = 'md', isAgent, className = '', onClick }) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-32 h-32'
  };

  const statusColor = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-300',
    working: 'bg-blue-500',
    typing: 'bg-blue-600 animate-pulse'
  };

  const validSrc = src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'default')}`;

  return (
    <div className={`relative shrink-0 ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <img 
        src={validSrc} 
        alt={name || 'User avatar'} 
        onError={(e) => {
          e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'fallback')}`;
        }}
        className={`${sizeMap[size]} rounded-lg object-cover border border-slate-200 bg-slate-50 shadow-sm`}
      />
      {status && (
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusColor[status]}`}>
          {status === 'typing' && <span className="absolute inset-0 flex items-center justify-center text-[4px] text-white">•••</span>}
        </div>
      )}
      {isAgent && (
        <div className="absolute -top-1 -left-1 bg-blue-600 text-white w-3.5 h-3.5 rounded flex items-center justify-center border border-white shadow-sm">
          <i className="fas fa-robot text-[7px]"></i>
        </div>
      )}
    </div>
  );
};

export default Avatar;
