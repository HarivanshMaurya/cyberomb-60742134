import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Image, Settings, LogOut,
  PanelLeftClose, PanelLeft, Newspaper, Globe, Search,
  Palette, Layers, Tags, LayoutGrid, Users, ShoppingCart,
  Mail, Database, BarChart3, Shield, Settings2, Heart,
  MessageSquare, Navigation, ChevronDown, Languages, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavGroup {
  label: string;
  items: { to: string; icon: any; label: string; end?: boolean; badge?: number }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/admin/security-analytics', icon: Shield, label: 'Security Tools' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/ai-writer', icon: Sparkles, label: 'AI Writer' },
      { to: '/admin/articles', icon: Newspaper, label: 'Articles' },
      { to: '/admin/wellness-articles', icon: Heart, label: 'Wellness' },
      { to: '/admin/categories', icon: Tags, label: 'Categories' },
      { to: '/admin/authors', icon: Users, label: 'Authors' },
      { to: '/admin/products', icon: ShoppingCart, label: 'Products' },
    ],
  },
  {
    label: 'Pages & Layout',
    items: [
      { to: '/admin/pages', icon: FileText, label: 'Pages' },
      { to: '/admin/page-sections', icon: Layers, label: 'Page Sections' },
      { to: '/admin/section-cards', icon: LayoutGrid, label: 'Section Cards' },
      { to: '/admin/hero', icon: Palette, label: 'Hero Section' },
      { to: '/admin/navbar', icon: Navigation, label: 'Navbar' },
    ],
  },
  {
    label: 'Audience',
    items: [
      { to: '/admin/subscribers', icon: Mail, label: 'Subscribers' },
      { to: '/admin/contact-messages', icon: MessageSquare, label: 'Messages' },
      { to: '/admin/users', icon: Shield, label: 'Users' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/media', icon: Image, label: 'Media Library' },
      { to: '/admin/languages', icon: Languages, label: 'Languages' },
      { to: '/admin/sections', icon: Globe, label: 'Site Content' },
      { to: '/admin/seo', icon: Search, label: 'SEO Settings' },
      { to: '/admin/database', icon: Database, label: 'Database' },
      { to: '/admin/site-settings', icon: Settings2, label: 'Site Settings' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminSidebar() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isItemActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  const isGroupActive = (group: NavGroup) =>
    group.items.some(item => isItemActive(item.to, item.end));

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Admin CMS</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Management Panel</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => {
          const active = isGroupActive(group);

          if (collapsed) {
            // In collapsed mode, just show icons
            return (
              <div key={group.label} className="space-y-0.5 mb-2">
                {group.items.map((item) => {
                  const itemActive = isItemActive(item.to, item.end);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      className={cn(
                        'flex items-center justify-center p-2 rounded-lg transition-colors',
                        'hover:bg-muted/60',
                        itemActive && 'bg-primary/10 text-primary'
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                    </NavLink>
                  );
                })}
              </div>
            );
          }

          return (
            <Collapsible key={group.label} defaultOpen={active}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md hover:bg-muted/40">
                <span>{group.label}</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const itemActive = isItemActive(item.to, item.end);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                        'hover:bg-muted/60',
                        itemActive
                          ? 'bg-primary/10 text-primary font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', itemActive && 'text-primary')} />
                      <span>{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-muted/30">
            <p className="text-xs font-medium truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Administrator</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-9',
            collapsed && 'justify-center'
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
