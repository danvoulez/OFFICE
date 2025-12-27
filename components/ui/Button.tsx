
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 rounded-lg border select-none";
  
  const variants = {
    primary: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800",
    secondary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
    success: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
    ghost: "bg-transparent text-slate-600 border-transparent hover:bg-slate-100",
    outline: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50",
    danger: "bg-white text-red-600 border-red-200 hover:bg-red-50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <i className="fas fa-circle-notch animate-spin mr-2"></i>
      ) : icon ? (
        <i className={`${icon} mr-2`}></i>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
