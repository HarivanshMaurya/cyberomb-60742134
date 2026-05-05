import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPublicOrigin } from '@/lib/redirectUrl';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus, KeyRound, ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle2, Sparkles, Shield, ArrowRight, User } from 'lucide-react';

type ViewMode = 'signin' | 'signup' | 'forgot' | 'forgot-sent';
type SocialProvider = 'google' | 'apple';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<ViewMode>('signin');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signUp, user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromAdmin = location.state?.from?.pathname?.startsWith('/admin');

  useEffect(() => {
    if (user && !authLoading) {
      const timer = setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Check your email to verify.');
      setView('signin');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicOrigin()}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setView('forgot-sent');
    }
    setIsLoading(false);
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleSocialSignIn = async (provider: SocialProvider, label: string) => {
    const setProviderLoading = provider === 'google' ? setGoogleLoading : setAppleLoading;
    setProviderLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getPublicOrigin(),
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });
      if (error) {
        console.error(`${label} sign in error:`, error);
        toast.error(`${label} sign in failed: ` + (error.message || 'Unknown error'));
        setProviderLoading(false);
      }
    } catch (err) {
      console.error(`${label} sign in exception:`, err);
      toast.error(`${label} sign in failed. Please try again.`);
      setProviderLoading(false);
    }
  };

  const handleGoogleSignIn = () => handleSocialSignIn('google', 'Google');

  const handleAppleSignIn = () => handleSocialSignIn('apple', 'Apple');

  const passwordStrength = (() => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Good' : 'Strong';
  const strengthColor = passwordStrength <= 1 ? 'bg-destructive' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-accent';

  if (user && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  

  // Social buttons
  const SocialButtons = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="group relative flex items-center justify-center gap-2.5 h-[52px] rounded-2xl border-2 border-transparent bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all duration-300 disabled:opacity-50"
        >
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-5 w-5 relative" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span className="relative text-sm font-medium">Google</span>
        </button>

        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={appleLoading}
          className="group relative flex items-center justify-center gap-2.5 h-[52px] rounded-2xl border-2 border-transparent bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all duration-300 disabled:opacity-50"
        >
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />
          {appleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-5 w-5 relative" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          <span className="relative text-sm font-medium">Apple</span>
        </button>
      </div>
    </div>
  );

  // Divider
  const OrDivider = () => (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/40 font-semibold">or</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="relative flex items-center justify-center px-4 py-10 md:py-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/[0.02] rounded-full blur-[120px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }} />
        </div>

        <div className="relative w-full max-w-[480px]">
          {/* Main card with glass effect */}
          <div className="relative rounded-[2rem] border border-border/30 bg-card/70 backdrop-blur-2xl shadow-[0_30px_60px_-15px_hsl(var(--primary)/0.07)] overflow-hidden">
            
            {/* Top gradient accent */}
            <div className="h-1 bg-gradient-to-r from-primary/60 via-accent/40 to-primary/60" />

            {/* Animated inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/[0.04] rounded-full blur-[80px]" />

            {/* Header area */}
            <div className="relative px-8 sm:px-10 pt-10 pb-2 text-center">
              {view === 'signin' && (
                <div className="animate-fade-in">
                  <div className="mx-auto mb-6 relative w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 rotate-6 scale-95" />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 -rotate-3 scale-[0.98]" />
                    <div className="relative h-full rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center backdrop-blur-sm">
                      <LogIn className="h-9 w-9 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-[2rem] font-serif font-bold tracking-tight text-foreground">
                    Welcome Back
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
                    {fromAdmin ? 'Admin access requires authentication' : 'Sign in to continue your journey'}
                  </p>
                </div>
              )}
              {view === 'signup' && (
                <div className="animate-fade-in">
                  <div className="mx-auto mb-6 relative w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/10 to-primary/10 rotate-6 scale-95" />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/5 to-primary/5 -rotate-3 scale-[0.98]" />
                    <div className="relative h-full rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10 flex items-center justify-center backdrop-blur-sm">
                      <Sparkles className="h-9 w-9 text-accent" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-[2rem] font-serif font-bold tracking-tight text-foreground">
                    Create Account
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">Join our community in seconds</p>
                </div>
              )}
              {view === 'forgot' && (
                <div className="animate-fade-in">
                  <div className="mx-auto mb-6 relative w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary/10 to-primary/10 rotate-6 scale-95" />
                    <div className="relative h-full rounded-3xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/10 flex items-center justify-center backdrop-blur-sm">
                      <Shield className="h-9 w-9 text-secondary-foreground" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-[2rem] font-serif font-bold tracking-tight text-foreground">
                    Recover Access
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">We'll send a secure reset link</p>
                </div>
              )}
              {view === 'forgot-sent' && (
                <div className="animate-fade-in">
                  <div className="mx-auto mb-6 relative w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/10 to-primary/10 rotate-6 scale-95 animate-pulse" />
                    <div className="relative h-full rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10 flex items-center justify-center backdrop-blur-sm">
                      <CheckCircle2 className="h-9 w-9 text-accent" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-[2rem] font-serif font-bold tracking-tight text-foreground">
                    Check Your Inbox
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">A reset link has been sent</p>
                </div>
              )}
            </div>

            {/* Form area */}
            <div className="px-8 sm:px-10 py-6 space-y-6">

              {/* Sign In */}
              {view === 'signin' && (
                <div className="space-y-5 animate-fade-in">
                  {/* Social buttons first */}
                  <SocialButtons />
                  <OrDivider />

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                        Email
                      </Label>
                      <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'email' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          required
                          className="pl-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setView('forgot')}
                          className="text-[11px] text-primary/60 hover:text-primary font-semibold transition-colors tracking-wide"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'password' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          required
                          minLength={6}
                          className="pl-11 pr-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-[52px] rounded-2xl gap-2.5 text-sm font-bold tracking-wide shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isLoading ? 'Signing in...' : 'Sign In'}
                      {!isLoading && <ArrowRight className="h-4 w-4 ml-1" />}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground pt-1">
                    New here?{' '}
                    <button type="button" onClick={() => { setView('signup'); setPassword(''); }} className="text-primary font-bold hover:underline underline-offset-4 transition-colors">
                      Create Account
                    </button>
                  </p>
                </div>
              )}

              {/* Sign Up */}
              {view === 'signup' && (
                <div className="space-y-5 animate-fade-in">
                  <SocialButtons />
                  <OrDivider />

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                        Full Name
                      </Label>
                      <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'name' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Your full name"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          className="pl-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signupEmail" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                        Email
                      </Label>
                      <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'signupEmail' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40" />
                        <Input
                          id="signupEmail"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('signupEmail')}
                          onBlur={() => setFocusedField(null)}
                          required
                          className="pl-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signupPassword" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                        Password
                      </Label>
                      <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'signupPassword' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40" />
                        <Input
                          id="signupPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('signupPassword')}
                          onBlur={() => setFocusedField(null)}
                          required
                          minLength={6}
                          className="pl-11 pr-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                      {password.length > 0 && (
                        <div className="space-y-1.5 pt-1 px-1">
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                  passwordStrength >= i ? strengthColor : 'bg-muted/60'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-[11px] font-semibold ${passwordStrength <= 1 ? 'text-destructive' : passwordStrength <= 3 ? 'text-yellow-600' : 'text-accent'}`}>
                            {strengthLabel} password
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-[52px] rounded-2xl gap-2.5 text-sm font-bold tracking-wide shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isLoading ? 'Creating Account...' : 'Get Started'}
                      {!isLoading && <ArrowRight className="h-4 w-4 ml-1" />}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground pt-1">
                    Already a member?{' '}
                    <button type="button" onClick={() => { setView('signin'); setPassword(''); }} className="text-primary font-bold hover:underline underline-offset-4 transition-colors">
                      Sign In
                    </button>
                  </p>
                </div>
              )}

              {/* Forgot Password */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="resetEmail" className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">
                      Registered Email
                    </Label>
                    <div className={`relative group rounded-2xl border-2 transition-all duration-300 bg-muted/20 hover:bg-muted/30 ${focusedField === 'resetEmail' ? 'border-primary/60 bg-muted/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]' : 'border-transparent'}`}>
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('resetEmail')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className="pl-11 h-[52px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm rounded-2xl"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed ml-1">
                      A secure password reset link will be sent to this address.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-[52px] rounded-2xl gap-2.5 text-sm font-bold tracking-wide shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)]"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setView('signin')}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto group"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to sign in
                  </button>
                </form>
              )}

              {/* Forgot Sent */}
              {view === 'forgot-sent' && (
                <div className="space-y-5 text-center animate-fade-in">
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 space-y-4 border border-border/20">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/10 flex items-center justify-center mx-auto">
                      <Mail className="h-7 w-7 text-accent" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                      If this email is registered, you'll receive a secure reset link shortly. Check both inbox and spam.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-2xl border-border/40"
                      onClick={() => setView('forgot')}
                    >
                      Didn't receive? Try again
                    </Button>
                    <button
                      type="button"
                      onClick={() => setView('signin')}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto group"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to sign in
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 sm:px-10 pb-8 pt-2">
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em] font-semibold">
                <Shield className="h-3 w-3" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>

          {/* Decorative bottom shadow */}
          <div className="mx-8 h-12 bg-primary/[0.02] rounded-b-[2rem] blur-2xl -mt-6" />
        </div>
      </div>
    </div>
  );
}
