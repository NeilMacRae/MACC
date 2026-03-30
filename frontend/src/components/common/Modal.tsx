// ─── Modal ────────────────────────────────────────────────────────────────────
// Prism-migrated: wraps @ecoonline/prism-web-components-react PrismDialog.
//
// PrismDialog API:
//   open (boolean)         — controls visibility
//   label (string)         — dialog title displayed in header
//   onRequestClose (fn)    — called when user requests close (X button, Escape,
//                            backdrop click via 'p-request-close' custom event)
//
// Footer slot: pass <PrismButton slot="footer"> children into PrismDialog.
// The description prop is rendered as content before main children.

import { useEffect } from 'react';
import { PrismDialog } from '../../prism';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;

  // PrismDialog handles Escape internally via its `onRequestClose` event.
  // We also listen for keydown here as a fallback for consumers expecting
  // direct Escape handling (e.g. unit tests firing document keydown).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <PrismDialog
      open={open}
      label={title}
      onRequestClose={onClose}
    >
      {description && (
        <p className="mb-4 text-sm text-gray-500">{description}</p>
      )}
      {children}
      {footer && (
        <div slot="footer" className="flex items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </PrismDialog>
  );
}
