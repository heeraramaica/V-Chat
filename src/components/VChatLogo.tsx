import React, { useState } from 'react';

interface VChatLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'text-only';
  theme?: 'dark' | 'light' | 'white';
}

export const VChatLogo: React.FC<VChatLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  theme = 'dark'
}) => {
  const [imageError, setImageError] = useState(false);

  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const textColor = theme === 'dark' ? '#FFFFFF' : theme === 'white' ? '#FFFFFF' : '#0F294A';

  const renderIcon = () => {
    if (!imageError) {
      return (
        <img
          src="/vchat_logo.png"
          alt="V-Chat Logo"
          onError={() => setImageError(true)}
          className={`${iconDimensions[size]} rounded-xl object-cover shadow-sm ring-1 ring-white/10 shrink-0 select-none`}
        />
      );
    }

    // High fidelity SVG fallback matching the exact attached logo
    return (
      <div className={`${iconDimensions[size]} rounded-xl bg-gradient-to-br from-[#0284C7] via-[#0284C7] to-[#0369A1] p-1 flex items-center justify-center shadow-md ring-1 ring-white/20 shrink-0 select-none`}>
        <div className="w-full h-full rounded-full border-2 border-white/90 flex items-center justify-center relative">
          <span 
            className="text-white font-serif font-bold italic select-none"
            style={{ 
              fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
              fontSize: size === 'sm' ? '14px' : size === 'md' ? '18px' : size === 'lg' ? '24px' : '32px',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transform: 'translateY(-1px)'
            }}
          >
            V
          </span>
          <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-white transform rotate-45" />
        </div>
      </div>
    );
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {variant !== 'text-only' && renderIcon()}

      {variant !== 'icon-only' && (
        <div className="flex items-center tracking-tight leading-none font-bold">
          <span
            className={`font-black ${textSizes[size]} tracking-tight flex items-center`}
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.03em'
            }}
          >
            <span style={{ color: '#0EA5E9' }}>V</span>
            <span style={{ color: textColor }}>-Chat</span>
          </span>
        </div>
      )}
    </div>
  );
};
