import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'cursor-pointer group whitespace-nowrap focus-visible:outline-none inline-flex items-center justify-center has-data-[arrow=true]:justify-between text-sm font-medium ring-offset-background transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 data-[state=open]:bg-primary/90',
        mono: 'bg-zinc-950 text-white dark:bg-zinc-300 dark:text-black hover:bg-zinc-950/90 dark:hover:bg-zinc-300/90 data-[state=open]:bg-zinc-950/90 dark:data-[state=open]:bg-zinc-300/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 data-[state=open]:bg-destructive/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 data-[state=open]:bg-secondary/90',
        outline: 'bg-background text-accent-foreground border border-input hover:bg-accent data-[state=open]:bg-accent',
        dashed:
          'text-accent-foreground border border-input border-dashed bg-background hover:bg-accent hover:text-accent-foreground data-[state=open]:text-accent-foreground',
        ghost:
          'text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        dim: 'text-muted-foreground hover:text-foreground data-[state=open]:text-foreground',
        foreground: '',
        inverse: '',
      },
      appearance: {
        default: '',
        ghost: '',
      },
      underline: {
        solid: '',
        dashed: '',
      },
      underlined: {
        solid: '',
        dashed: '',
      },
      size: {
        lg: 'h-10 rounded-md px-4 text-sm gap-1.5 [&_svg:not([class*=size-])]:size-4',
        md: 'h-[34px] rounded-md px-3 gap-1.5 text-[0.8125rem] [&_svg:not([class*=size-])]:size-4',
        sm: 'h-7 rounded-md px-2.5 gap-1.25 text-xs [&_svg:not([class*=size-])]:size-3.5',
        icon: 'w-[34px] h-[34px] rounded-md [&_svg:not([class*=size-])]:size-4 shrink-0',
      },
      autoHeight: {
        true: '',
        false: '',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
      mode: {
        default: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        icon: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        link: 'text-primary h-auto p-0 bg-transparent rounded-none hover:bg-transparent data-[state=open]:bg-transparent',
        input: `
            justify-start font-normal hover:bg-background [&_svg]:transition-colors [&_svg]:hover:text-foreground data-[state=open]:bg-background 
            focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 
            [[data-state=open]>&]:border-ring [[data-state=open]>&]:outline-none [[data-state=open]>&]:ring-[3px] 
            [[data-state=open]>&]:ring-ring/30 
            aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
            in-data-[invalid=true]:border-destructive/60 in-data-[invalid=true]:ring-destructive/10  dark:in-data-[invalid=true]:border-destructive dark:in-data-[invalid=true]:ring-destructive/20
          `,
      },
      placeholder: {
        true: 'text-muted-foreground',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'ghost',
        mode: 'default',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'outline',
        mode: 'default',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'dashed',
        mode: 'default',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'secondary',
        mode: 'default',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'outline',
        mode: 'input',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'outline',
        mode: 'icon',
        className: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        size: 'md',
        autoHeight: true,
        className: 'h-auto min-h-[34px]',
      },
      {
        size: 'sm',
        autoHeight: true,
        className: 'h-auto min-h-7',
      },
      {
        size: 'lg',
        autoHeight: true,
        className: 'h-auto min-h-10',
      },
      {
        variant: 'primary',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'mono',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'secondary',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'outline',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'dashed',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'destructive',
        mode: 'default',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'primary',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'mono',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'secondary',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'outline',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'dashed',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'destructive',
        mode: 'icon',
        appearance: 'default',
        className: 'shadow-sm',
      },
      {
        variant: 'primary',
        mode: 'link',
        underline: 'solid',
        className:
          'font-medium text-primary hover:text-primary/90 hover:underline hover:underline-offset-4',
      },
      {
        variant: 'ghost',
        mode: 'icon',
        className: 'text-muted-foreground',
      },
      {
        size: 'sm',
        mode: 'icon',
        className: 'w-7 h-7 p-0 [&_svg:not([class*=size-])]:size-3.5',
      },
      {
        size: 'md',
        mode: 'icon',
        className: 'w-[34px] h-[34px] p-0 [&_svg:not([class*=size-])]:size-4',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      mode: 'default',
      size: 'md',
      shape: 'default',
      appearance: 'default',
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      selected?: boolean;
      asChild?: boolean;
    }
>(({ className, selected, variant, shape, appearance, mode, size, autoHeight, underlined, underline, asChild = false, placeholder = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(
        buttonVariants({
          variant,
          size,
          shape,
          appearance,
          mode,
          autoHeight,
          placeholder,
          underlined,
          underline,
          className,
        }),
        asChild && props.disabled && 'pointer-events-none opacity-50',
      )}
      {...(selected && { 'data-state': 'open' })}
      {...props}
    />
  );
});
Button.displayName = 'Button';

const ButtonArrow = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement> & { icon?: LucideIcon }
>(({ icon: Icon = ChevronDown, className, ...props }, ref) => {
  return <Icon ref={ref} data-slot="button-arrow" className={cn('ms-auto -me-1', className)} {...props} />;
});
ButtonArrow.displayName = 'ButtonArrow';

export { Button, ButtonArrow, buttonVariants };
