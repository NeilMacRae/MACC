import React, { forwardRef, useEffect, useMemo, useRef } from 'react';

// Register only the web components we actually use.
import '@ecoonline/prism-web-components/dist/components/pwc-button.js';
import '@ecoonline/prism-web-components/dist/components/pwc-dialog.js';
import '@ecoonline/prism-web-components/dist/components/pwc-badge.js';
import '@ecoonline/prism-web-components/dist/components/pwc-alert.js';
import '@ecoonline/prism-web-components/dist/components/pwc-tag.js';
import '@ecoonline/prism-web-components/dist/components/pwc-spinner.js';
import '@ecoonline/prism-web-components/dist/components/pwc-icon.js';
import '@ecoonline/prism-web-components/dist/components/pwc-input.js';
import '@ecoonline/prism-web-components/dist/components/pwc-textarea.js';
import '@ecoonline/prism-web-components/dist/components/pwc-select.js';
import '@ecoonline/prism-web-components/dist/components/pwc-option.js';
import '@ecoonline/prism-web-components/dist/components/pwc-checkbox.js';
// Sidebar navigation icons (Phase 6 / US4)
import '@ecoonline/prism-web-components/dist/components/icons/meter.js';
import '@ecoonline/prism-web-components/dist/components/icons/chart--column-floating.js';
import '@ecoonline/prism-web-components/dist/components/icons/earth.js';
import '@ecoonline/prism-web-components/dist/components/icons/wrench.js';

type PrismEventHandler = ((e: Event) => void) | undefined;

function mergeRefs<T>(
  ...refs: Array<React.ForwardedRef<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}

function usePrismEvents<T extends HTMLElement>(
  elementRef: React.RefObject<T | null>,
  handlers: Record<string, PrismEventHandler>,
) {
  const activeHandlers = useMemo(() => {
    return Object.entries(handlers).filter(([, handler]) => Boolean(handler)) as Array<
      [string, (e: Event) => void]
    >;
  }, [handlers]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || activeHandlers.length === 0) return;

    for (const [eventName, handler] of activeHandlers) {
      el.addEventListener(eventName, handler as EventListener);
    }

    return () => {
      for (const [eventName, handler] of activeHandlers) {
        el.removeEventListener(eventName, handler as EventListener);
      }
    };
  }, [elementRef, activeHandlers]);
}

function usePrismProp<T extends HTMLElement, K extends string>(
  elementRef: React.RefObject<T | null>,
  propName: K,
  value: unknown,
) {
  useEffect(() => {
    const el = elementRef.current as any;
    if (!el) return;
    if (value === undefined) return;
    try {
      el[propName] = value;
    } catch {
      // Ignore: some components may not expose the property.
    }
  }, [elementRef, propName, value]);
}

// ─────────────────────────────────────────────────────────────────────────────
// PrismButton
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismButtonProps {
  children?: React.ReactNode;
  primary?: boolean;
  secondary?: boolean;
  critical?: boolean;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (e: Event) => void;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  className?: string;
  slot?: string;
  label?: string;
}

export const PrismButton = forwardRef<HTMLElement, PrismButtonProps>(
  function PrismButton(
    { onClick, primary, secondary, critical, loading, disabled, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    // Use native 'click' rather than the 'p-click' Prism custom event.
    // Native click is dispatched with composed:true so it exits the shadow DOM
    // and reaches the host element — this fires reliably in both real browsers
    // and Playwright's headless environment. 'p-click' is only fired when the
    // event originates inside the shadow-DOM button, which isn't guaranteed
    // when Playwright dispatches a synthetic click on the host element.
    usePrismEvents(innerRef, { click: onClick as any });

    // React 18 serialises boolean props on custom elements as the attribute
    // string "false", but Lit's type:Boolean converter treats *any present
    // attribute* as truthy — so loading="false" === loading=true in Lit,
    // causing a permanent loading spinner. Only forward the attribute when
    // the value is actually true so Lit's fromAttribute receives null (absent)
    // for false, which it correctly converts to false.
    const boolAttrs: Record<string, true> = {};
    if (primary)             boolAttrs.primary   = true;
    if (secondary)           boolAttrs.secondary = true;
    if (critical)            boolAttrs.critical  = true;
    if (loading)             boolAttrs.loading   = true;
    if (disabled || loading) boolAttrs.disabled  = true;

    return React.createElement('pwc-button', { ...rest, ...boolAttrs, ref });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismDialog
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismDialogProps {
  open?: boolean;
  label?: string;
  description?: string;
  onRequestClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const PrismDialog = forwardRef<HTMLElement, PrismDialogProps>(
  function PrismDialog(
    { open, onRequestClose, children, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    // Set open as a direct DOM property (needed for Lit property binding).
    usePrismProp(innerRef, 'open', open);
    usePrismEvents(innerRef, {
      'p-request-close': onRequestClose as any,
    });

    // Also pass open as an attribute when true so that:
    //  (a) Lit's attributeChangedCallback fires immediately on mount, and
    //  (b) the CSS attribute selector [open] matches from the first render,
    //      which Playwright uses to detect the dialog: locator('pwc-dialog[open]').
    // We only forward it when true — false is handled by Modal returning null,
    // and we must not pass open="false" (Lit treats any present attribute as
    // truthy for Boolean-typed properties).
    const openAttr = open ? { open: true } : {};

    return React.createElement('pwc-dialog', { ...rest, ...openAttr, ref }, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismBadge
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismBadgeProps {
  variant?: 'primary' | 'success' | 'neutral' | 'warning' | 'danger';
  pill?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const PrismBadge = forwardRef<HTMLElement, PrismBadgeProps>(
  function PrismBadge(props, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    return React.createElement('pwc-badge', { ...props, ref });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismTag
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismTagProps {
  variant?: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' | 'text';
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

export const PrismTag = forwardRef<HTMLElement, PrismTagProps>(function PrismTag(
  props,
  forwardedRef,
) {
  const innerRef = useRef<HTMLElement | null>(null);
  const ref = mergeRefs(forwardedRef, innerRef);

  return React.createElement('pwc-tag', { ...props, ref });
});

// ─────────────────────────────────────────────────────────────────────────────
// PrismSpinner
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const PrismSpinner = forwardRef<HTMLElement, PrismSpinnerProps>(
  function PrismSpinner(props, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    return React.createElement('pwc-spinner', { ...props, ref });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismAlert
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismAlertProps {
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  title?: string;
  open?: boolean;
  closable?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const PrismAlert = forwardRef<HTMLElement, PrismAlertProps>(
  function PrismAlert({ children, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    return React.createElement('pwc-alert', { ...rest, ref }, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismIcon
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismIconProps {
  icon?: string;
  size?: string | number;
  className?: string;
}

export const PrismIcon = forwardRef<HTMLElement, PrismIconProps>(
  function PrismIcon(props, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    return React.createElement('pwc-icon', { ...props, ref });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismInput
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismInputProps {
  type?: string;
  label?: string;
  value?: string | number;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
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

export const PrismInput = forwardRef<HTMLElement, PrismInputProps>(function PrismInput(
  { value, onInput, onChange, ...rest },
  forwardedRef,
) {
  const innerRef = useRef<HTMLElement | null>(null);
  const ref = mergeRefs(forwardedRef, innerRef);

  usePrismProp(innerRef, 'value', value);
  usePrismEvents(innerRef, {
    'p-input': onInput as any,
    'p-change': onChange as any,
  });

  return React.createElement('pwc-input', { ...rest, ref });
});

// ─────────────────────────────────────────────────────────────────────────────
// PrismTextarea
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismTextareaProps {
  label?: string;
  value?: string;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  helpText?: string;
  errorMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PrismTextarea = forwardRef<HTMLElement, PrismTextareaProps>(
  function PrismTextarea({ value, onInput, onChange, children, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    usePrismProp(innerRef, 'value', value);
    usePrismEvents(innerRef, {
      'p-input': onInput as any,
      'p-change': onChange as any,
    });

    return React.createElement('pwc-textarea', { ...rest, ref }, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismSelect + PrismOption
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismSelectProps {
  label?: string;
  value?: string;
  onChange?: (e: Event) => void;
  required?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  name?: string;
  id?: string;
  helpText?: string;
  errorMessage?: string;
}

export const PrismSelect = forwardRef<HTMLElement, PrismSelectProps>(
  function PrismSelect({ value, onChange, children, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    usePrismProp(innerRef, 'value', value);
    usePrismEvents(innerRef, {
      'p-change': onChange as any,
    });

    return React.createElement('pwc-select', { ...rest, ref }, children);
  },
);

export interface PrismOptionProps {
  value?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const PrismOption = forwardRef<HTMLElement, PrismOptionProps>(
  function PrismOption({ children, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    return React.createElement('pwc-option', { ...rest, ref }, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismCheckbox
// ─────────────────────────────────────────────────────────────────────────────

export interface PrismCheckboxProps {
  checked?: boolean;
  onChange?: (e: Event) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  name?: string;
  value?: string;
  indeterminate?: boolean;
}

export const PrismCheckbox = forwardRef<HTMLElement, PrismCheckboxProps>(
  function PrismCheckbox(
    { checked, indeterminate, onChange, children, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    usePrismProp(innerRef, 'checked', checked);
    usePrismProp(innerRef, 'indeterminate', indeterminate);
    usePrismEvents(innerRef, {
      'p-change': onChange as any,
    });

    return React.createElement('pwc-checkbox', { ...rest, ref }, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismRange
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PrismHeader  (pwc-header — EcoOnline app-shell top bar)
// ─────────────────────────────────────────────────────────────────────────────
import '@ecoonline/prism-web-components/dist/components/pwc-header.js';

export interface PrismHeaderProps {
  /** URL the logo links to. Omit to suppress link. */
  logoUrl?: string;
  /** Accessible title for the logo link (default: "EcoOnline"). */
  logoTitle?: string;
  /** Slot content rendered in the navigation area (right side). */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PrismHeader = forwardRef<HTMLElement, PrismHeaderProps>(
  function PrismHeader({ children, logoUrl, logoTitle, className, style }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    const attrs: Record<string, unknown> = { ref };
    if (className) attrs.class = className;
    if (style) attrs.style = style;
    // Forward kebab-case attributes only when explicitly provided
    if (logoUrl !== undefined) attrs['logo-url'] = logoUrl;
    if (logoTitle !== undefined) attrs['logo-title'] = logoTitle;

    return React.createElement('pwc-header', attrs, children);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PrismHeaderMenuItem  (pwc-header-menu-item — navigation list item)
// ─────────────────────────────────────────────────────────────────────────────
import '@ecoonline/prism-web-components/dist/components/pwc-header-menu-item.js';

export interface PrismHeaderMenuItemProps {
  /** Visible text label. */
  label?: string;
  /** Prism icon name (renders pwc-icon inside the item). */
  icon?: string;
  /** Path to a custom icon image (used when `icon` is absent). */
  iconPath?: string;
  /**
   * When set the item renders as an <a> element. Omit to render as <button>
   * so that React Router's onClick handler handles navigation instead.
   */
  href?: string;
  /** Link target (only used when href is set). */
  target?: string;
  /** Native click handler — fires on both mouse and keyboard activation. */
  onClick?: (e: Event) => void;
  style?: React.CSSProperties;
  className?: string;
  /** Set to "page" for the currently active navigation item (aria). */
  'aria-current'?: string;
}

export const PrismHeaderMenuItem = forwardRef<HTMLElement, PrismHeaderMenuItemProps>(
  function PrismHeaderMenuItem({ onClick, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLElement | null>(null);
    const ref = mergeRefs(forwardedRef, innerRef);

    // Native 'click' bubbles out of shadow DOM with composed:true and is
    // reliably dispatched in both browsers and Playwright headless.
    usePrismEvents(innerRef, { click: onClick as PrismEventHandler });

    return React.createElement('pwc-header-menu-item', { ...rest, ref });
  },
);
