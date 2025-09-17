import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthOptimized';
import { usePortalContent } from '@/hooks/usePortalContent';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Settings, Phone, Calendar, Shield, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { activityLogger } from '@/utils/activityLogger';
import Header from '@/components/Header';
import AccessDenied from './AccessDenied';
import { LoadingIcon } from '@/components/LoadingSpinner';

// Reduced lazy loading - only for heavy components
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const CoachingCard = React.lazy(() => import('@/components/client-portal/CoachingCard'));
const KPITile = React.lazy(() => import('@/components/client-portal/KPITile'));
const EmptyState = React.lazy(() => import('@/components/client-portal/EmptyState'));
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));

// Newsletter components
import { NewsletterSubscriptionCard } from '@/components/client-portal/NewsletterSubscriptionCard';
import { AdminNewsletterStats } from '@/components/client-portal/AdminNewsletterStats';

const ClientPortal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userRole, companies, loading: authLoading, authReady } = useAuth();
  const navigate = useNavigate();
  
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [resolving, setResolving] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isAdminSimulating, setIsAdminSimulating] = useState(false);

  // Use optimized portal content hook
  const { content, loading: contentLoading, error: contentError, refresh } = usePortalContent({
    companyId: currentCompany?.id || null,
    enabled: !!currentCompany && authReady
  });

  // Single effect for company resolution and access control
  useEffect(() => {
    if (!authReady) return;
    
    const resolveCompanyAccess = async () => {
      setResolving(true);
      setAccessError(null);
      setIsAdminSimulating(false);

      // Handle unauthenticated users
      if (!user) {
        navigate('/access-denied');
        return;
      }

      // Find company by slug in user's companies first
      let company = companies?.find(c => c.slug === slug);
      
      // If Admin and company not found in their list, try to fetch any company by slug
      if (!company && userRole === 'Admin') {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('id, name, slug')
            .eq('slug', slug)
            .single();

          if (!error && data) {
            company = {
              id: data.id,
              name: data.name,
              slug: data.slug,
              userRole: 'Admin',
              isAdmin: true
            };
            setIsAdminSimulating(true);
          }
        } catch (err) {
          console.error('Failed to fetch company for admin:', err);
        }
      }
      
      if (!company) {
        if (companies && companies.length === 1) {
          // Single company - redirect
          navigate(`/${companies[0].slug}`, { replace: true });
          return;
        } else if (!companies || companies.length === 0) {
          setAccessError('No company access assigned. Please contact your administrator.');
        } else {
          setAccessError('Company not found or access denied.');
        }
        setResolving(false);
        return;
      }

      // Set current company
      setCurrentCompany(company);
      setResolving(false);

      // Fire-and-forget activity logging to prevent blocking
      if (user?.id && user?.email) {
        setTimeout(() => {
          activityLogger.logCompanyAccess(
            user.id, 
            user.email, 
            company.id, 
            company.name
          ).catch(console.error);
        }, 0);
      }
    };

    resolveCompanyAccess();
  }, [authReady, user, companies, userRole, slug, navigate]);

  // Log portal view after content loads (fire-and-forget)
  useEffect(() => {
    if (currentCompany && user?.id && user?.email && !contentLoading && !contentError) {
      setTimeout(() => {
        activityLogger.logPortalView(
          user.id, 
          user.email, 
          currentCompany.id, 
          currentCompany.name,
          []
        ).catch(console.error);
      }, 0);
    }
  }, [currentCompany, user, contentLoading, contentError]);

  // Show initial loading only during auth
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <LoadingIcon size="lg" />
            <p className="text-muted-foreground">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied for non-authenticated users
  if (!user) {
    return <AccessDenied />;
  }

  // Show company resolution loading
  if (resolving) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <LoadingIcon size="lg" />
            <p className="text-muted-foreground">Resolving company access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access error
  if (accessError) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Access Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{accessError}</p>
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check company access
  const isCompanyMember = companies?.some(c => c.id === currentCompany?.id);
  const isAdmin = userRole === 'Admin';
  const hasAccess = isAdmin || isCompanyMember;

  if (!hasAccess) {
    return <AccessDenied />;
  }

  // Handle content error
  if (contentError && !contentLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Content Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{contentError}</p>
              <Button onClick={refresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Content
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasAnyContent = 
    content.announcements.length > 0 || 
    content.resources.length > 0 || 
    content.useful_links.length > 0 || 
    content.coaching.length > 0 || 
    content.kpis.length > 0 || 
    content.faqs.length > 0 || 
    content.ai_tools.length > 0;

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-20">
      <Header />
      
      {/* Admin Simulation Alert */}
      {isAdminSimulating && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <div className="container mx-auto py-3">
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950">
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="flex items-center justify-between">
                <div className="text-amber-800 dark:text-amber-200">
                  <strong>Admin Simulation Mode:</strong> You're viewing this portal as an administrator. 
                  You're seeing the client experience for <strong>{currentCompany?.name}</strong>.
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      
      <div className="container mx-auto py-8 space-y-8">
        {/* Portal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {currentCompany?.name || 'Client Portal'}
              {isAdminSimulating && (
                <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                  (Admin View)
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">
              {isAdminSimulating 
                ? "Viewing client portal experience as administrator"
                : "Welcome to your personalized dashboard"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isAdminSimulating && isAdmin && (
              <Button asChild variant="outline">
                <a href="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Content
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Content Loading State - Dashboard Skeleton */}
        {contentLoading && (
          <div className="dashboard-layout">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main content skeleton */}
              <div className="lg:col-span-8 space-y-6">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </div>
              {/* Sidebar skeleton */}
              <div className="lg:col-span-4 space-y-6">
                <Skeleton className="h-40 w-full" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portal Content - Dashboard Layout */}
        {!contentLoading && (
          <div className="dashboard-layout">
            {/* Dashboard Grid Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Main Dashboard Area - Left Column */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* At-a-Glance Summary */}
                <Card className="bg-gradient-to-br from-forest-green/5 to-sage/10 border-forest-green/20 animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-forest-green">Dashboard Overview</CardTitle>
                    <CardDescription>Your personalized content summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-forest-green">{content.announcements.length}</div>
                        <div className="text-sm text-muted-foreground">Announcements</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-forest-green">{content.resources.length}</div>
                        <div className="text-sm text-muted-foreground">Resources</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-forest-green">{content.ai_tools.length}</div>
                        <div className="text-sm text-muted-foreground">AI Tools</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-forest-green">{content.useful_links.length}</div>
                        <div className="text-sm text-muted-foreground">Quick Links</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPIs Dashboard Widget */}
                {content.kpis.length > 0 && (
                  <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-forest-green">Performance Metrics</h2>
                      <div className="w-2 h-2 bg-forest-green rounded-full animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {content.kpis.map((kpi: any, index: number) => (
                        <div key={index} className="animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                            <div className="card-energy">
                              <KPITile 
                                label={kpi.name || 'KPI'} 
                                value={kpi.value || '0'} 
                                target={kpi.target}
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Announcements Widget */}
                {content.announcements.length > 0 && (
                  <div className="animate-slide-up-delayed">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-forest-green">Latest Updates</h2>
                      <div className="text-sm bg-forest-green/10 text-forest-green px-2 py-1 rounded-full">
                        {content.announcements.length} new
                      </div>
                    </div>
                    <div className="space-y-3">
                      {content.announcements.slice(0, 3).map((announcement: any, index: number) => (
                        <div key={announcement.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                            <div className="interactive-scale">
                              <AnnouncementCard 
                                title={announcement.title}
                                date={new Date(announcement.created_at).toLocaleDateString()}
                                summary={announcement.summary}
                                content={announcement.content}
                                url={announcement.url}
                                status="New"
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                      {content.announcements.length > 3 && (
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="p-4 text-center">
                            <p className="text-muted-foreground text-sm">
                              +{content.announcements.length - 3} more announcements available
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Resources Grid Widget */}
                {content.resources.length > 0 && (
                  <div className="animate-slide-up-delayed-2">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-forest-green">Resource Library</h2>
                      <div className="text-sm text-muted-foreground">{content.resources.length} available</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {content.resources.slice(0, 4).map((resource: any, index: number) => (
                        <div key={resource.id} className="animate-elastic-in" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                            <div className="card-energy">
                              <ResourceCard 
                                title={resource.title}
                                type={resource.category || 'Guide'}
                                href={resource.link}
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                    </div>
                    {content.resources.length > 4 && (
                      <div className="mt-4 text-center">
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="p-4">
                            <p className="text-muted-foreground text-sm">
                              +{content.resources.length - 4} more resources in your library
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Sidebar - Quick Access */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Coaching Sessions Widget */}
                {content.coaching.length > 0 && (
                  <div className="animate-slide-left">
                    <h3 className="text-lg font-semibold text-forest-green mb-4">Upcoming Sessions</h3>
                    <div className="space-y-3">
                      {content.coaching.map((session, index) => (
                        <Card key={session.id} className="interactive-lift bg-gradient-to-r from-sage/5 to-forest-green/5">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Calendar className="h-4 w-4 text-forest-green" />
                              {session.topic}
                            </CardTitle>
                            {session.description && (
                              <CardDescription className="text-sm">{session.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                              <CoachingCard nextSession={session.contact} />
                            </Suspense>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Tools Widget */}
                {content.ai_tools.length > 0 && (
                  <div className="animate-slide-left-delayed">
                    <h3 className="text-lg font-semibold text-forest-green mb-4">AI Toolkit</h3>
                    <div className="space-y-3">
                      {content.ai_tools.slice(0, 3).map((tool: any, index: number) => (
                        <div key={tool.id} className="animate-spring-up" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                            <div className="interactive-scale">
                              <AiToolCard 
                                title={tool.ai_tool}
                                url={tool.url}
                                comments={tool.comments}
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                      {content.ai_tools.length > 3 && (
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="p-3 text-center">
                            <p className="text-muted-foreground text-xs">
                              +{content.ai_tools.length - 3} more tools
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Links Widget */}
                {content.useful_links.length > 0 && (
                  <div className="animate-slide-left-delayed">
                    <h3 className="text-lg font-semibold text-forest-green mb-4">Quick Access</h3>
                    <div className="space-y-2">
                      {content.useful_links.slice(0, 4).map((link: any, index: number) => (
                        <div key={link.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                            <div className="interactive-lift">
                              <UsefulLinkCard 
                                title={link.title}
                                url={link.url}
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                      {content.useful_links.length > 4 && (
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="p-2 text-center">
                            <p className="text-muted-foreground text-xs">
                              +{content.useful_links.length - 4} more links
                            </p>
                          </CardContent>
                        </Card>
                      )}
                     </div>
                   </div>
                 )}

                {/* Newsletter Subscription Management */}
                <div className="animate-slide-left-delayed">
                  <NewsletterSubscriptionCard companyId={currentCompany?.id} />
                </div>

                {/* Admin Newsletter Analytics */}
                {(isAdmin || currentCompany?.isAdmin) && currentCompany?.id && (
                  <div className="animate-slide-left-delayed">
                    <AdminNewsletterStats companyId={currentCompany.id} />
                  </div>
                )}
              </div>
            </div>

            {/* Empty State */}
            {!hasAnyContent && (
              <div className="col-span-full animate-fade-in">
                <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                  <EmptyState message="No content available for this company portal." />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* Contact Footer */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2">Need Support?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact our team for assistance with your portal.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientPortal;