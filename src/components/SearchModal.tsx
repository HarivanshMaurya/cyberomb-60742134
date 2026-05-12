import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, Compass } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useArticles } from "@/hooks/useArticles";
import { useActiveProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Group = "all" | "categories" | "articles" | "ebooks";

const STORAGE_KEY = "cyberom:search-modal";

const SearchModal = ({ open, onOpenChange }: SearchModalProps) => {
  const navigate = useNavigate();
  const { data: articles } = useArticles("published");
  const { data: products } = useActiveProducts();
  const { data: categories } = useCategories();

  // Restore persisted query + group from localStorage
  const persisted = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as {
        query?: string;
        group?: Group;
      };
    } catch {
      return {};
    }
  })();

  const [query, setQuery] = useState(persisted.query || "");
  const [group, setGroup] = useState<Group>(persisted.group || "all");

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ query, group }));
    } catch {
      /* ignore */
    }
  }, [query, group]);

  // Track previously focused element so we can restore focus on close
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (previousFocusRef.current) {
      // Defer to next tick so Radix completes its own focus management first
      const el = previousFocusRef.current;
      requestAnimationFrame(() => {
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      });
    }
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const topArticles = useMemo(() => (articles || []).slice(0, 8), [articles]);
  const topProducts = useMemo(() => (products || []).slice(0, 6), [products]);

  const showCategories = group === "all" || group === "categories";
  const showArticles = group === "all" || group === "articles";
  const showEbooks = group === "all" || group === "ebooks";

  const groups: { id: Group; label: string }[] = [
    { id: "all", label: "All" },
    { id: "categories", label: "Categories" },
    { id: "articles", label: "Articles" },
    { id: "ebooks", label: "eBooks" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search articles, eBooks, categories…"
        autoFocus
        value={query}
        onValueChange={setQuery}
      />

      {/* Group filter chips */}
      <div className="flex items-center gap-1.5 border-b px-3 py-2 overflow-x-auto">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroup(g.id)}
            aria-pressed={group === g.id}
            className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              group === g.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        {showCategories && categories && categories.length > 0 && (
          <CommandGroup heading="Categories">
            {categories.map((c) => (
              <CommandItem
                key={c.id}
                value={`category ${c.name}`}
                onSelect={() => go(`/category/${c.slug}`)}
              >
                <Compass className="w-4 h-4 mr-2 text-muted-foreground" />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showArticles && topArticles.length > 0 && (
          <>
            {showCategories && <CommandSeparator />}
            <CommandGroup heading="Articles">
              {topArticles.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`article ${a.title} ${a.category}`}
                  onSelect={() => go(`/blog/${a.slug}`)}
                >
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{a.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {a.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {showEbooks && topProducts.length > 0 && (
          <>
            {(showCategories || showArticles) && <CommandSeparator />}
            <CommandGroup heading="eBooks">
              {topProducts.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`ebook ${p.title}`}
                  onSelect={() => go(`/product/${p.slug}`)}
                >
                  <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{p.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
            open
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
            close
          </span>
        </div>
        <span className="hidden sm:inline">⌘K</span>
      </div>
    </CommandDialog>
  );
};

export default SearchModal;
