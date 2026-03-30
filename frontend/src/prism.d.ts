export * from "./prism/index";

/**
 * Type declarations for @ecoonline/prism-web-components-react.
 *
 * The package ships no .d.ts files. This declaration provides typed interfaces
 * for every Prism component used in this codebase so that `tsc --noEmit` passes
 * without loosening `strict` mode or `noImplicitAny`.
 */

declare module "@ecoonline/prism-web-components-react" {
  import type React from "react";

  // ── Shared helper types ─────────────────────────────────────────────────────
  type PInputEvent = React.FormEvent<HTMLInputElement>;
  type PSelectEvent = React.FormEvent<HTMLSelectElement>;
  type PTextareaEvent = React.FormEvent<HTMLTextAreaElement>;
  type PCheckboxEvent = React.FormEvent<HTMLInputElement>;
  type PMouseEvent = React.MouseEvent<HTMLElement>;
  type PKeyEvent = React.KeyboardEvent<HTMLElement>;

  // ── PrismButton ─────────────────────────────────────────────────────────────
  interface PrismButtonProps {
    children?: React.ReactNode;
    primary?: boolean;
    secondary?: boolean;
    critical?: boolean;
    loading?: boolean;
    disabled?: boolean;
    size?: "small" | "medium" | "large";
    onClick?: (e: PMouseEvent) => void;
    type?: "button" | "submit" | "reset";
    name?: string;
    value?: string;
    className?: string;
    slot?: string;
    /** Aria label for icon-only buttons */
    label?: string;
  }
  export const PrismButton: React.FC<PrismButtonProps>;

  // ── PrismInput ──────────────────────────────────────────────────────────────
  interface PrismInputProps {
    type?: string;
    /** Renders as the visible label above the input */
    label?: string;
    value?: string | number;
    onInput?: (e: PInputEvent) => void;
    onChange?: (e: PInputEvent) => void;
    onKeyDown?: (e: PKeyEvent) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    name?: string;
    id?: string;
    helpText?: string;
    errorMessage?: string;
    className?: string;
  }
  export const PrismInput: React.FC<PrismInputProps>;

  // ── PrismSelect + PrismOption ────────────────────────────────────────────────
  interface PrismSelectProps {
    label?: string;
    value?: string;
    onChange?: (e: PSelectEvent) => void;
    required?: boolean;
    disabled?: boolean;
    children?: React.ReactNode;
    className?: string;
    name?: string;
    id?: string;
    helpText?: string;
    errorMessage?: string;
  }
  export const PrismSelect: React.FC<PrismSelectProps>;

  interface PrismOptionProps {
    value?: string;
    children?: React.ReactNode;
    disabled?: boolean;
  }
  export const PrismOption: React.FC<PrismOptionProps>;

  // ── PrismTextarea ───────────────────────────────────────────────────────────
  interface PrismTextareaProps {
    label?: string;
    value?: string;
    onInput?: (e: PTextareaEvent) => void;
    onChange?: (e: PTextareaEvent) => void;
    rows?: number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    id?: string;
    helpText?: string;
    errorMessage?: string;
    className?: string;
  }
  export const PrismTextarea: React.FC<PrismTextareaProps>;

  // ── PrismCheckbox / PrismCheckboxOption ─────────────────────────────────────
  interface PrismCheckboxProps {
    checked?: boolean;
    onChange?: (e: PCheckboxEvent) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    name?: string;
    value?: string;
    indeterminate?: boolean;
  }
  export const PrismCheckbox: React.FC<PrismCheckboxProps>;

  interface PrismCheckboxOptionProps {
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    children?: React.ReactNode;
  }
  export const PrismCheckboxOption: React.FC<PrismCheckboxOptionProps>;

  // ── PrismRange ──────────────────────────────────────────────────────────────
  interface PrismRangeProps {
    min?: number | string;
    max?: number | string;
    value?: number | string;
    step?: number | string;
    onInput?: (e: PInputEvent) => void;
    onChange?: (e: PInputEvent) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
  }
  export const PrismRange: React.FC<PrismRangeProps>;

  // ── PrismDialog ─────────────────────────────────────────────────────────────
  interface PrismDialogProps {
    open?: boolean;
    label?: string;
    description?: string;
    onRequestClose?: () => void;
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismDialog: React.FC<PrismDialogProps>;

  // ── PrismBadge ──────────────────────────────────────────────────────────────
  interface PrismBadgeProps {
    variant?: "primary" | "success" | "neutral" | "warning" | "danger";
    pill?: boolean;
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismBadge: React.FC<PrismBadgeProps>;

  // ── PrismTag ────────────────────────────────────────────────────────────────
  interface PrismTagProps {
    variant?: "primary" | "success" | "neutral" | "warning" | "danger" | "text";
    size?: "small" | "medium" | "large";
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismTag: React.FC<PrismTagProps>;

  // ── PrismTooltip ────────────────────────────────────────────────────────────
  interface PrismTooltipProps {
    content?: string;
    placement?: "top" | "bottom" | "left" | "right";
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismTooltip: React.FC<PrismTooltipProps>;

  // ── PrismSpinner ────────────────────────────────────────────────────────────
  interface PrismSpinnerProps {
    size?: "small" | "medium" | "large";
    className?: string;
  }
  export const PrismSpinner: React.FC<PrismSpinnerProps>;

  // ── PrismSkeleton ───────────────────────────────────────────────────────────
  interface PrismSkeletonProps {
    width?: string;
    height?: string;
    className?: string;
  }
  export const PrismSkeleton: React.FC<PrismSkeletonProps>;

  // ── PrismIcon ───────────────────────────────────────────────────────────────
  interface PrismIconProps {
    icon?: string;
    size?: string | number;
    className?: string;
  }
  export const PrismIcon: React.FC<PrismIconProps>;

  // ── PrismAlert ──────────────────────────────────────────────────────────────
  interface PrismAlertProps {
    variant?: "info" | "success" | "warning" | "danger";
    open?: boolean;
    closable?: boolean;
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismAlert: React.FC<PrismAlertProps>;

  // ── PrismHeader ─────────────────────────────────────────────────────────────
  interface PrismHeaderProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismHeader: React.FC<PrismHeaderProps>;

  interface PrismHeaderMenuProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismHeaderMenu: React.FC<PrismHeaderMenuProps>;

  interface PrismHeaderMenuItemProps {
    href?: string;
    active?: boolean;
    children?: React.ReactNode;
    onClick?: (e: PMouseEvent) => void;
    className?: string;
  }
  export const PrismHeaderMenuItem: React.FC<PrismHeaderMenuItemProps>;

  // ── PrismTab / PrismTabGroup / PrismTabPanel ─────────────────────────────────
  interface PrismTabGroupProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismTabGroup: React.FC<PrismTabGroupProps>;

  interface PrismTabProps {
    panel?: string;
    active?: boolean;
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismTab: React.FC<PrismTabProps>;

  interface PrismTabPanelProps {
    name?: string;
    children?: React.ReactNode;
    className?: string;
  }
  export const PrismTabPanel: React.FC<PrismTabPanelProps>;

  // ── PrismDivider ────────────────────────────────────────────────────────────
  export const PrismDivider: React.FC<{ className?: string }>;

  // ── PrismLabel ──────────────────────────────────────────────────────────────
  interface PrismLabelProps {
    children?: React.ReactNode;
    required?: boolean;
    className?: string;
  }
  export const PrismLabel: React.FC<PrismLabelProps>;

  // ── PrismProgressBar ────────────────────────────────────────────────────────
  interface PrismProgressBarProps {
    value?: number;
    max?: number;
    label?: string;
    className?: string;
  }
  export const PrismProgressBar: React.FC<PrismProgressBarProps>;

  // ── PrismWrapper ────────────────────────────────────────────────────────────
  export const PrismWrapper: React.FC<{ children?: React.ReactNode }>;

}
