/**
 * Переиспользуемая кнопка с вариантами оформления из design tokens.
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { space, radius } from '../theme/tokens';

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--color-neutral)',
    color: 'white',
    border: 'none',
  },
  success: {
    backgroundColor: 'var(--color-success)',
    color: 'white',
    border: 'none',
  },
  danger: {
    backgroundColor: 'var(--color-danger)',
    color: 'white',
    border: 'none',
  },
  warning: {
    backgroundColor: 'var(--color-warning)',
    color: 'white',
    border: 'none',
  },
  accent: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: 'none',
  },
};

const baseStyle: CSSProperties = {
  padding: `${space.sm} ${space.md}`,
  fontSize: '1rem',
  borderRadius: radius.sm,
  cursor: 'pointer',
  opacity: 1,
  fontFamily: 'inherit',
};

export type ButtonVariant = keyof typeof variantStyles;

export interface ButtonProps {
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  title?: string;
}

export default function Button({
  variant = 'primary',
  disabled = false,
  onClick,
  type = 'button',
  children,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  ...rest
}: ButtonProps) {
  const variantStyle = variantStyles[variant] ?? variantStyles.primary;
  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...variantStyle,
    ...(disabled && { opacity: 0.7, cursor: 'not-allowed' }),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={combinedStyle}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
}
