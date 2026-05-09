import { useState } from "react";
import { z } from "zod";
import { Check, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email" })
  .max(255);

interface NewsletterFormProps {
  variant?: "hero" | "compact";
  placeholder?: string;
  buttonText?: string;
  className?: string;
}

const NewsletterForm = ({
  variant = "hero",
  placeholder = "Your email",
  buttonText = "Subscribe",
  className,
}: NewsletterFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error: dbError } = await supabase
        .from("newsletter_subscribers")
        .upsert(
          { email: parsed.data, categories: [] },
          { onConflict: "email" }
        );
      if (dbError) throw dbError;
      setSuccess(true);
      setEmail("");
      toast.success("Subscribed successfully 🎉");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className={cn("flex gap-2 max-w-xs", className)}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          aria-label="Email address"
          className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Subscribe"
          className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 inline-flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
        </button>
        {error && <p className="sr-only">{error}</p>}
      </form>
    );
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          aria-label="Email address for newsletter"
          aria-invalid={!!error}
          className={cn(
            "flex-1 px-6 py-4 rounded-full border bg-background/80 backdrop-blur focus:outline-none focus:ring-2 transition-all",
            error
              ? "border-destructive focus:ring-destructive/40"
              : "border-border focus:ring-accent/40"
          )}
          disabled={loading || success}
        />
        <button
          type="submit"
          disabled={loading || success}
          className="px-8 py-4 rounded-full bg-accent text-accent-foreground font-semibold hover:scale-105 active:scale-100 transition-all disabled:opacity-70 disabled:hover:scale-100 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.55)] inline-flex items-center justify-center gap-2 min-w-[140px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subscribing
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4" />
              Subscribed
            </>
          ) : (
            buttonText
          )}
        </button>
      </form>
      <div className="h-5 mt-2 text-sm text-center">
        {error && <p className="text-destructive">{error}</p>}
        {success && !error && (
          <p className="text-accent">Thanks — check your inbox soon.</p>
        )}
      </div>
    </div>
  );
};

export default NewsletterForm;
