import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { matchesQuery } from "@/lib/format";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
  meta?: ReactNode;
  tag?: ReactNode;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  invalid?: boolean;
  id?: string;
  footer?: ReactNode;
  allowClear?: boolean;
}

const MAX_RESULTS = 150;

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyText = "No matches found",
  className,
  invalid,
  id,
  footer,
  allowClear = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const results = useMemo(
    () =>
      options
        .filter((o) => matchesQuery(`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`, query))
        .slice(0, MAX_RESULTS),
    [options, query],
  );

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-card px-3 text-left text-sm transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            invalid ? "border-destructive ring-1 ring-destructive" : "border-input",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <span className="font-medium text-foreground truncate">{selected.label}</span>
                {selected.hint && <span className="text-xs text-muted-foreground truncate">{selected.hint}</span>}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {allowClear && selected && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,max(var(--radix-popover-trigger-width,24rem),28rem))] p-0 shadow-pop border bg-popover"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("input");
          input?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3 bg-muted/30">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const r = results[active];
                if (r) pick(r.value);
              }
            }}
            placeholder={searchPlaceholder}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div ref={listRef} className="max-h-[min(55vh,22rem)] overflow-y-auto p-1 divide-y divide-border/20">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
          )}
          {results.map((o, i) => (
            <button
              key={o.value}
              type="button"
              data-idx={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                i === active ? "bg-accent/70 text-accent-foreground" : "text-foreground hover:bg-muted/50",
              )}
            >
              <Check className={cn("size-4 shrink-0", o.value === value ? "text-copper opacity-100" : "opacity-0")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold truncate">{o.label}</span>
                  {o.tag}
                </div>
                {o.hint && <div className="text-xs text-muted-foreground truncate mt-0.5">{o.hint}</div>}
              </div>
              {o.meta && <div className="shrink-0 ml-2">{o.meta}</div>}
            </button>
          ))}
        </div>
        {footer && <div className="border-t bg-muted/20 p-2 text-xs">{footer}</div>}
      </PopoverContent>
    </Popover>
  );
}
