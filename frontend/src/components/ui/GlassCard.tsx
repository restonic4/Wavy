import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const GlassCard = ({ children, className, ...props }: GlassCardProps) => {
    return (
        <div
            className={cn(
                "glass p-6 transition-all duration-300",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
