import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Article from "./pages/Article";
import Wellness from "./pages/Wellness";
import Travel from "./pages/Travel";
import Creativity from "./pages/Creativity";
import Growth from "./pages/Growth";
import About from "./pages/About";
import Authors from "./pages/Authors";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Articles from "./pages/Articles";
import DynamicPage from "./pages/DynamicPage";
import BlogArticle from "./pages/BlogArticle";
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import ReadBook from "./pages/ReadBook";
import Newsletter from "./pages/Newsletter";
import ResetPassword from "./pages/ResetPassword";
import WellnessArticlePage from "./pages/WellnessArticle";
import SecurityTools from "./pages/SecurityTools";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NavbarEditor from "./pages/admin/NavbarEditor";
import HeroEditor from "./pages/admin/HeroEditor";
import ArticlesList from "./pages/admin/ArticlesList";
import ArticleEditor from "./pages/admin/ArticleEditor";
import CategoriesManager from "./pages/admin/CategoriesManager";
import PagesList from "./pages/admin/PagesList";
import PageEditor from "./pages/admin/PageEditor";
import PageSectionsEditor from "./pages/admin/PageSectionsEditor";
import SectionCardsManager from "./pages/admin/SectionCardsManager";
import AuthorsManager from "./pages/admin/AuthorsManager";
import SiteSections from "./pages/admin/SiteSections";
import MediaLibrary from "./pages/admin/MediaLibrary";
import SEOSettings from "./pages/admin/SEOSettings";
import ProductsManager from "./pages/admin/ProductsManager";
import SubscribersManager from "./pages/admin/SubscribersManager";
import ContactMessages from "./pages/admin/ContactMessages";
import DatabaseBrowser from "./pages/admin/DatabaseBrowser";
import UserManagement from "./pages/admin/UserManagement";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import SiteSettingsHub from "./pages/admin/SiteSettingsHub";
import WellnessArticlesList from "./pages/admin/WellnessArticlesList";
import WellnessArticleEditor from "./pages/admin/WellnessArticleEditor";
import Settings from "./pages/admin/Settings";
import LanguagesManager from "./pages/admin/LanguagesManager";
import AIArticleWriter from "./pages/admin/AIArticleWriter";
import Preloader from "./components/Preloader";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Preloader />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/article/:id" element={<Article />} />
            <Route path="/wellness" element={<Wellness />} />
            <Route path="/wellness/:slug" element={<WellnessArticlePage />} />
            <Route path="/travel" element={<Travel />} />
            <Route path="/creativity" element={<Creativity />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/about" element={<About />} />
            <Route path="/authors" element={<Authors />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/page/:slug" element={<DynamicPage />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/read/:slug" element={<ReadBook />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/security-tools" element={<SecurityTools />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/404" element={<NotFound />} />

            {/* Admin Login */}
            <Route path="/admin/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="navbar" element={<NavbarEditor />} />
              <Route path="hero" element={<HeroEditor />} />
              <Route path="articles" element={<ArticlesList />} />
              <Route path="ai-writer" element={<AIArticleWriter />} />
              <Route path="articles/:id" element={<ArticleEditor />} />
              <Route path="categories" element={<CategoriesManager />} />
              <Route path="pages" element={<PagesList />} />
              <Route path="pages/:id" element={<PageEditor />} />
              <Route path="page-sections" element={<PageSectionsEditor />} />
              <Route path="section-cards" element={<SectionCardsManager />} />
              <Route path="authors" element={<AuthorsManager />} />
              <Route path="sections" element={<SiteSections />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="seo" element={<SEOSettings />} />
              <Route path="products" element={<ProductsManager />} />
              <Route path="subscribers" element={<SubscribersManager />} />
              <Route path="contact-messages" element={<ContactMessages />} />
              <Route path="database" element={<DatabaseBrowser />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="site-settings" element={<SiteSettingsHub />} />
              <Route path="wellness-articles" element={<WellnessArticlesList />} />
              <Route path="wellness-articles/:id" element={<WellnessArticleEditor />} />
              <Route path="settings" element={<Settings />} />
              <Route path="languages" element={<LanguagesManager />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
