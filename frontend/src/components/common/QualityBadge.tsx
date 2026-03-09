// ─── QualityBadge ─────────────────────────────────────────────────────────────
// Prism-migrated: wraps @ecoonline/prism-web-components-react PrismTag.
//
// PrismTag variants: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' | 'text'
//
// Quality mapping:
//   Actual    → 'success'  (green — confirmed data)
//   Estimated → 'warning'  (amber — estimated data)
//   Missing   → 'neutral'  (grey  — no data)

import React from 'react';
import { PrismTag } from '../../prism';

export type QualityLevel = 'Actual' | 'Estimated' | 'Missing';

interface QualityBadgeProps {
  quality: QualityLevel;
  tooltip?: string;
  className?: string;
}

const PRISM_VARIANT: Record<QualityLevel, 'success' | 'warning' | 'neutral'> = {
  Actual: 'success',
  Estimated: 'warning',
  Missing: 'neutral',
};

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  quality,
  tooltip,
  className,
}) => {
  return (
    <PrismTag
      variant={PRISM_VARIANT[quality]}
      size="small"
      title={tooltip}
      className={className}
    >
      {quality}
    </PrismTag>
  );
};
