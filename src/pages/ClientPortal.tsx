import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthOptimized';
import { usePortalContent } from '@/hooks/usePortalContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Settings, Phone, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { activityLogger } from '@/utils/activityLogger';
import Header from '@/components/Header';
import AccessDenied from './AccessDenied';

// Reduced lazy loading - only for heavy components
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const CoachingCard = React.lazy(() => import('@/components/client-portal/CoachingCard'));
const KPITile = React.lazy(() => import('@/components/client-portal/KPITile'));
const EmptyState = React.lazy(() => import('@/components/client-portal/EmptyState'));
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));

const ClientPortal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userRole, companies, loading: authLoading, authReady } = useAuth();
  const navigate = useNavigate();
  
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [resolving, setResolving] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Use optimized portal content hook
  const { content, loading: contentLoading, error: contentError, refresh } = usePortalContent({
    companyId: currentCompany?.id || null,
    enabled: !!currentCompany && authReady
  });

  // Single effect for company resolution and access control
  useEffect(() => {
    if (!authReady) return;
    
    setResolving(true);
    setAccessError(null);

    // Handle unauthenticated users
    if (!user) {
      navigate('/access-denied');
      return;
    }

    // Find company by slug
    const company = companies?.find(c => c.slug === slug);
    
    if (!company) {
      if (companies && companies.length === 1) {
        // Single company - redirect
        navigate(`/client-portal/${companies[0].slug}`, { replace: true });
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
  }, [authReady, user, companies, slug, navigate]);

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
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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
      <div className="container mx-auto py-8 space-y-8">
        {/* Portal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {currentCompany?.name || 'Client Portal'}
            </h1>
            <p className="text-muted-foreground">
              Welcome to your personalized dashboard
            </p>
          </div>
          {isAdmin && (
            <Button asChild variant="outline">
              <a href="/admin">
                <Settings className="h-4 w-4 mr-2" />
                Manage Content
              </a>
            </Button>
          )}
        </div>

        {/* Content Loading State */}
        {contentLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Portal Content */}
        {!contentLoading && (
          <div className="space-y-8">
            {/* KPIs Section */}
            {content.kpis.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Key Performance Indicators</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.kpis.map((kpi: any, index: number) => (
                    <Suspense key={index} fallback={<Skeleton className="h-48 w-full" />}>
                      <KPITile 
                        label={kpi.name || 'KPI'} 
                        value={kpi.value || '0'} 
                        target={kpi.target}
                      />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching Section */}
            {content.coaching.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Upcoming Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {content.coaching.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {session.topic}
                        </CardTitle>
                        {session.description && (
                          <CardDescription>{session.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                          <CoachingCard nextSession={session.contact} />
                        </Suspense>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Announcements Section */}
            {content.announcements.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Announcements</h2>
                <div className="space-y-4">
                  {content.announcements.map((announcement: any) => (
                    <Suspense key={announcement.id} fallback={<Skeleton className="h-32 w-full" />}>
                      <AnnouncementCard 
                        title={announcement.title}
                        date={new Date(announcement.created_at).toLocaleDateString()}
                        summary={announcement.summary}
                        content={announcement.content}
                        url={announcement.url}
                        status="New"
                      />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            {/* Resources Section */}
            {content.resources.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.resources.map((resource: any) => (
                    <Suspense key={resource.id} fallback={<Skeleton className="h-48 w-full" />}>
                      <ResourceCard 
                        title={resource.title}
                        type={resource.category || 'Guide'}
                        href={resource.link}
                      />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            {/* AI Tools Section */}
            {content.ai_tools.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">AI Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.ai_tools.map((tool: any) => (
                    <Suspense key={tool.id} fallback={<Skeleton className="h-48 w-full" />}>
                      <AiToolCard 
                        title={tool.ai_tool}
                        url={tool.url}
                        comments={tool.comments}
                      />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            {/* Useful Links Section */}
            {content.useful_links.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Useful Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.useful_links.map((link: any) => (
                    <Suspense key={link.id} fallback={<Skeleton className="h-48 w-full" />}>
                      <UsefulLinkCard 
                        title={link.title}
                        url={link.url}
                      />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!hasAnyContent && (
              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <EmptyState message="No content available for this company portal." />
              </Suspense>
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