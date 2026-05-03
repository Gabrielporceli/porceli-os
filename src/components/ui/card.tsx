'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

type CardContextType = {
  variant: 'default' | 'accent';
};

const CardContext = React.createContext<CardContextType>({
  variant: 'default',
});

const useCardContext = () => {
  const context = React.useContext(CardContext);
  return context;
};

const cardVariants = cva('flex flex-col items-stretch text-card-foreground rounded-xl', {
  variants: {
    variant: {
      default: 'bg-card border border-border shadow-sm',
      accent: 'bg-muted shadow-sm p-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardHeaderVariants = cva('flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5', {
  variants: {
    variant: {
      default: 'border-b border-border',
      accent: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardContentVariants = cva('grow p-5', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-t-xl [&:last-child]:rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardTableVariants = cva('grid grow', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardFooterVariants = cva('flex items-center px-5 min-h-14', {
  variants: {
    variant: {
      default: 'border-t border-border',
      accent: 'bg-card rounded-b-xl mt-[2px]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant = 'default', ...props }, ref) => (
  <CardContext.Provider value={{ variant: variant || 'default' }}>
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  </CardContext.Provider>
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { variant } = useCardContext();
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(cardHeaderVariants({ variant }), className)}
      {...props}
    />
  );
});
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { variant } = useCardContext();
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn(cardContentVariants({ variant }), className)}
      {...props}
    />
  );
});
CardContent.displayName = 'CardContent';

const CardTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { variant } = useCardContext();
  return (
    <div
      ref={ref}
      data-slot="card-table"
      className={cn(cardTableVariants({ variant }), className)}
      {...props}
    />
  );
});
CardTable.displayName = 'CardTable';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { variant } = useCardContext();
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(cardFooterVariants({ variant }), className)}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';

const CardHeading = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="card-heading" className={cn('space-y-1', className)} {...props} />
));
CardHeading.displayName = 'CardHeading';

const CardToolbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="card-toolbar" className={cn('flex items-center gap-2.5', className)} {...props} />
));
CardToolbar.displayName = 'CardToolbar';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="card-title"
    className={cn('text-base font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardHeading, CardTable, CardTitle, CardToolbar };
