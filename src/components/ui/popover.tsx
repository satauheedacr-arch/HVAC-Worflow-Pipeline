import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined);

export function Popover({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (val: boolean) => {
      if (onOpenChange) onOpenChange(val);
      if (!isControlled) setUncontrolledOpen(val);
    },
    [onOpenChange, isControlled],
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block w-full" ref={triggerRef}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("PopoverTrigger must be used inside Popover");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.setOpen(!ctx.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <div onClick={handleClick} className="w-full">
      {children}
    </div>
  );
}

export function PopoverContent({
  className,
  align = "start",
  children,
  onOpenAutoFocus,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
  onOpenAutoFocus?: (e: { preventDefault: () => void; currentTarget: HTMLElement }) => void;
}) {
  const ctx = React.useContext(PopoverContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx?.open) return;

    if (contentRef.current && onOpenAutoFocus) {
      onOpenAutoFocus({
        preventDefault: () => {},
        currentTarget: contentRef.current,
      });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        ctx.triggerRef.current &&
        !ctx.triggerRef.current.contains(e.target as Node)
      ) {
        ctx.setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ctx, onOpenAutoFocus]);

  if (!ctx?.open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 mt-1 min-w-[200px] rounded-md border bg-popover text-popover-foreground shadow-pop outline-none",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
