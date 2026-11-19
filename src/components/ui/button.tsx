import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "copper";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

    const variants = {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      destructive: "bg-danger text-white shadow-sm hover:bg-danger/90",
      outline: "border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-accent-foreground underline-offset-4 hover:underline",
      copper: "bg-copper text-white shadow-sm hover:bg-copper-dark focus-visible:ring-copper",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-5 text-sm",
      icon: "size-10",
    };

    const compClass = cn(base, variants[variant], sizes[size], className);

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(compClass, (children.props as { className?: string }).className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={compClass} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
