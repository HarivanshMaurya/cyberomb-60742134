import { useState, useEffect } from "react";
import { Menu, X, Moon, Sun, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavbarConfig } from "@/hooks/useNavbarConfig";
import cyberomLogo from "@/assets/cyberom-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: navbarConfig } = useNavbarConfig();

  const siteName = navbarConfig?.site_name || 'Cyberom';
  const logoSrc = navbarConfig?.logo_url || cyberomLogo;
  const showLogo = navbarConfig?.show_logo ?? true;
  const showSiteName = navbarConfig?.show_site_name ?? true;
  const navLinks = (navbarConfig?.nav_links || [])
    .filter(l => l.visible)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add("dark");

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    navigate('/');
  };

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 py-2 sm:py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 pill-nav px-4 sm:px-6">
          <div className="flex items-center min-w-0">
            <a href="/" className="flex items-center gap-1.5 sm:gap-2">
              {showLogo && (
                <img src={logoSrc} alt={siteName} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain flex-shrink-0" />
              )}
              {showSiteName && (
                <span className="text-base sm:text-xl font-bold font-serif truncate">{siteName}</span>
              )}
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-muted/60 transition-all" aria-label="Toggle theme">
              {isDark ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {!isAdminPage && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center gap-2">
                    {isAdmin && (
                      <Button variant="ghost" className="rounded-full px-4 py-2" onClick={() => navigate('/admin')}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />Dashboard
                      </Button>
                    )}
                    <Button variant="outline" className="rounded-full px-4 py-2" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />Logout
                    </Button>
                  </div>
                ) : (
                  <Button className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2 hover:scale-105 transition-all" onClick={() => navigate('/login')}>
                    <LogIn className="h-4 w-4 mr-2" />Login
                  </Button>
                )}
              </>
            )}

            <button className="md:hidden p-1.5 sm:p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in bg-background/95 backdrop-blur-md rounded-b-2xl shadow-lg mt-1 px-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-sm font-medium hover:text-accent transition-colors">
                  {link.label}
                </a>
              ))}
              {!isAdminPage && (
                <>
                  {user ? (
                    <>
                      {isAdmin && (
                        <Button variant="ghost" className="rounded-full w-full justify-start" onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}>
                          <LayoutDashboard className="h-4 w-4 mr-2" />Dashboard
                        </Button>
                      )}
                      <Button variant="outline" className="rounded-full w-full" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                        <LogOut className="h-4 w-4 mr-2" />Logout
                      </Button>
                    </>
                  ) : (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-full" onClick={() => { navigate('/login'); setIsMenuOpen(false); }}>
                      <LogIn className="h-4 w-4 mr-2" />Login
                    </Button>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
