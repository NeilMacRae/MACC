import React from 'react';

export type QualityLevel = 'Actual' | 'Estimated' | 'Missing';

interface QualityBadgeProps {
  quality: QualityLevel;
  tooltip?: string;
  className?: string;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  quality,
  tooltip,
  className = '',
}) => {
  const getColorClasses = () => {
    switch (quality) {
      case 'Actual':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Estimated':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Missing':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const badge = (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getColorClasses()} ${className}`}
      title={tooltip}
    >
      {quality}
    </span>
  );

  if (tooltip) {
    return (
      <span className="relative group">
        {badge}
        <span className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 whitespace-nowrap">
          {tooltip}
          <svg
            className="absolute text-gray-900 h-2 w-full left-0 top-full"
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
          </svg>
        </span>
      </span>
    );
  }

  return badge;
};
