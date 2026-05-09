import { useState, useEffect, useMemo } from "react";
import { Menu, X, Moon, Sun, LogIn, LogOut, LayoutDashboard, Search, ChevronDown } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavbarConfig } from "@/hooks/useNavbarConfig";
import { useCategories } from "@/hooks/useCategories";
import SearchModal from "@/components/SearchModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import cyberomLogo from "@/assets/cyberom-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: navbarConfig } = useNavbarConfig();
  const { data: categories } = useCategories();

  const siteName = navbarConfig?.site_name || "Cyberom";
  const logoSrc = navbarConfig?.logo_url || cyberomLogo;
  const showLogo = navbarConfig?.show_logo ?? true;
  const showSiteName = navbarConfig?.show_site_name ?? true;
  const navLinks = useMemo(
    () =>
      (navbarConfig?.nav_links || [])
        .filter((l) => l.visible)
        .sort((a, b) => a.order - b.order),
    [navbarConfig]
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add("dark");
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 py-2 sm:py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 pill-nav px-4 sm:px-6 transition-all duration-300">
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
              {showLogo && (
                <img
                  src={logoSrc}
                  alt={siteName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain flex-shrink-0"
                />
              )}
              {showSiteName && (
                <span className="text-base sm:text-xl font-semibold tracking-tight truncate">
                  {siteName}
                </span>
              )}
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-full px-3.5 py-1.5 transition-all"
              >
                {link.label}
              </Link>
            ))}

            {categories && categories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-full px-3.5 py-1.5 transition-all data-[state=open]:bg-muted/60 outline-none">
                  Categories
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 transition-transform duration-300 data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  sideOffset={12}
                  className="w-64 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--shadow-soft)/0.35)] p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200"
                >
                  <DropdownMenuLabel className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground px-3 pb-1">
                    Browse
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onSelect={() => navigate(`/category/${c.slug}`)}
                      className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-muted/70 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {c.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="p-1.5 sm:p-2 rounded-full hover:bg-muted/60 transition-all"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full hover:bg-muted/60 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            {!isAdminPage && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center gap-2 ml-1">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        className="rounded-full px-4 py-2"
                        onClick={() => navigate("/admin")}
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-full px-4 py-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 py-2 ml-1 hover:scale-[1.03] transition-all"
                    onClick={() => navigate("/login")}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                )}
              </>
            )}

            <button
              className="md:hidden p-1.5 sm:p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in bg-background/95 backdrop-blur-md rounded-b-2xl shadow-lg mt-1 px-4">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium hover:text-accent transition-colors py-1"
                >
                  {link.label}
                </Link>
              ))}
              {categories && categories.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    Categories
                  </p>
                  <div className="flex flex-col gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        to={`/category/${c.slug}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="text-sm text-foreground/80 hover:text-accent transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {!isAdminPage && (
                <>
                  {user ? (
                    <>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          className="rounded-full w-full justify-start"
                          onClick={() => {
                            navigate("/admin");
                            setIsMenuOpen(false);
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="rounded-full w-full"
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-full"
                      onClick={() => {
                        navigate("/login");
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;
