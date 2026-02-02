import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const GlassButton = ({
    children,
    className,
    variant = 'primary',
    ...props
}: GlassButtonProps) => {
    return (
        <button
            className={cn(
                "glass-button font-medium flex items-center justify-center gap-2",
                variant === 'secondary' && "bg-sky-100/30 hover:bg-sky-200/40",
                variant === 'ghost' && "bg-transparent border-transparent shadow-none hover:bg-white/20",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
