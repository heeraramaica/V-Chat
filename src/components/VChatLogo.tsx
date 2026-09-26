import React from 'react';

interface VChatLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'text-only';
  theme?: 'dark' | 'light' | 'white';
}

export const VChatLogo: React.FC<VChatLogoProps> = ({
  className = '',
  size = 'md',
  theme = 'dark'
}) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  // Text color based on navbar/container theme
  // On dark navbar (#0F294A): text is white
  // On light modal/bg: text is dark navy (#0F294A)
  const textColor = theme === 'dark' ? '#FFFFFF' : theme === 'white' ? '#FFFFFF' : '#0F294A';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* "V-Chat" Brand Typography - Only V-Chat (logo image removed per user request) */}
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
    </div>
  );
};


