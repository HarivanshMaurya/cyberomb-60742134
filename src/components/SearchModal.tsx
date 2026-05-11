import { useEffect, useMemo } from "react";
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

const SearchModal = ({ open, onOpenChange }: SearchModalProps) => {
  const navigate = useNavigate();
  const { data: articles } = useArticles("published");
  const { data: products } = useActiveProducts();
  const { data: categories } = useCategories();

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search articles, eBooks, categories…" autoFocus />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        {categories && categories.length > 0 && (
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

        {topArticles.length > 0 && (
          <>
            <CommandSeparator />
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

        {topProducts.length > 0 && (
          <>
            <CommandSeparator />
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

      {/* Keyboard hints — focus trap & Esc handled by Radix Dialog, arrows/enter by cmdk */}
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
