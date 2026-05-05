 import { useState, useEffect } from 'react';
 import { useHeroContent, useUpdateHeroContent } from '@/hooks/useHeroContent';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Button } from '@/components/ui/button';
import { Loader2, Save, Eye } from 'lucide-react';
import HeroSection from '@/components/HeroSection';
 
 export default function HeroEditor() {
   const { data: hero, isLoading } = useHeroContent();
   const updateHero = useUpdateHeroContent();
 
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    background_image: '',
    button_text: '',
    button_link: '',
    instagram_url: '',
    facebook_url: '',
    linkedin_url: '',
    twitter_url: '',
  });
 
   useEffect(() => {
     if (hero) {
        setFormData({
          title: hero.title,
          subtitle: hero.subtitle,
          background_image: hero.background_image,
          button_text: hero.button_text,
          button_link: hero.button_link,
          instagram_url: hero.instagram_url || '',
          facebook_url: hero.facebook_url || '',
          linkedin_url: hero.linkedin_url || '',
          twitter_url: hero.twitter_url || '',
        });
     }
   }, [hero]);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!hero) return;
 
     updateHero.mutate({
       id: hero.id,
       ...formData,
     });
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold">Hero Section</h1>
           <p className="text-muted-foreground mt-1">
             Edit the hero section that appears on your homepage
           </p>
         </div>
         <Button variant="outline" asChild>
           <a href="/" target="_blank" rel="noopener noreferrer">
             <Eye className="mr-2 h-4 w-4" />
             View Live
           </a>
         </Button>
       </div>
 
       <div className="grid lg:grid-cols-2 gap-6">
         {/* Form */}
         <Card>
           <CardHeader>
             <CardTitle>Hero Content</CardTitle>
             <CardDescription>
               Changes will be reflected immediately on your website
             </CardDescription>
           </CardHeader>
           <CardContent>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="title">Title</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="Enter hero title"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="subtitle">Subtitle / Description</Label>
                 <Textarea
                   id="subtitle"
                   value={formData.subtitle}
                   onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                   placeholder="Enter hero description"
                   rows={4}
                 />
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="background_image">Background Image URL</Label>
                 <Input
                   id="background_image"
                   value={formData.background_image}
                   onChange={(e) => setFormData({ ...formData, background_image: e.target.value })}
                   placeholder="https://example.com/image.jpg"
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="button_text">Button Text</Label>
                   <Input
                     id="button_text"
                     value={formData.button_text}
                     onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                     placeholder="Join Now"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="button_link">Button Link</Label>
                   <Input
                     id="button_link"
                     value={formData.button_link}
                     onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                     placeholder="#signup"
                   />
                 </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-semibold">Social Media Links</Label>
                  <p className="text-sm text-muted-foreground">Leave empty to hide the icon</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram URL</Label>
                  <Input
                    id="instagram_url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook URL</Label>
                  <Input
                    id="facebook_url"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter / X URL</Label>
                  <Input
                    id="twitter_url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://x.com/yourprofile"
                  />
                </div>
 
               <Button type="submit" disabled={updateHero.isPending} className="w-full">
                 {updateHero.isPending ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Saving...
                   </>
                 ) : (
                   <>
                     <Save className="mr-2 h-4 w-4" />
                     Save Changes
                   </>
                 )}
               </Button>
             </form>
           </CardContent>
         </Card>
 
          {/* Preview - exact same component as frontend */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Exact same hero as your homepage. Save changes to see updates here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-border bg-background">
                <div
                  className="relative origin-top-left"
                  style={{
                    width: '1400px',
                    height: '900px',
                    transform: 'scale(0.32)',
                    transformOrigin: 'top left',
                    marginBottom: `calc(900px * -0.68)`,
                    marginRight: `calc(1400px * -0.68)`,
                  }}
                >
                  <HeroSection />
                </div>
              </div>
            </CardContent>
          </Card>
       </div>
     </div>
   );
 }