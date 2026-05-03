'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  'inline-flex items-center justify-center border border-transparent font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success:
          'bg-[var(--color-success-accent,var(--color-green-500))] text-[var(--color-success-foreground,var(--color-white))]',
        warning:
          'bg-[var(--color-warning-accent,var(--color-yellow-500))] text-[var(--color-warning-foreground,var(--color-white))]',
        info: 'bg-[var(--color-info-accent,var(--color-violet-500))] text-[var(--color-info-foreground,var(--color-white))]',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
      },
      size: {
        lg: 'rounded-md px-[0.5rem] h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5',
        md: 'rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5 ',
        sm: 'rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'rounded-sm px-[0.25rem] h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className:
          'text-primary bg-primary/10',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className: 'bg-secondary dark:bg-secondary/50 text-secondary-foreground',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  },
);

const badgeButtonVariants = cva(
  'cursor-pointer transition-all inline-flex items-center justify-center leading-none p-0 rounded-md -me-0.5 opacity-60 hover:opacity-100',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, appearance, shape, asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

const BadgeButton = React.forwardRef<HTMLButtonElement, BadgeButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="badge-button"
        className={cn(badgeButtonVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
BadgeButton.displayName = 'BadgeButton';

const BadgeDot = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="badge-dot"
      className={cn('size-1.5 rounded-full bg-current opacity-75', className)}
      {...props}
    />
  )
);
BadgeDot.displayName = 'BadgeDot';

export { Badge, BadgeButton, BadgeDot, badgeVariants };
