import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Settings, Phone, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { activityLogger } from '@/utils/activityLogger';
import Header from '@/components/Header';
import AccessDenied from './AccessDenied';

// Lazy load components for better performance
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const CoachingCard = React.lazy(() => import('@/components/client-portal/CoachingCard'));
const KPITile = React.lazy(() => import('@/components/client-portal/KPITile'));
const EmptyState = React.lazy(() => import('@/components/client-portal/EmptyState'));
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));

interface PortalContent {
  announcements: any[];
  resources: any[];
  useful_links: any[];
  ai_tools: any[];
  faqs: any[];
  coaching: any[];
  kpis: any[];
}

const ClientPortal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userRole, companies, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalContent, setPortalContent] = useState<PortalContent>({
    announcements: [],
    resources: [],
    useful_links: [],
    ai_tools: [],
    faqs: [],
    coaching: [],
    kpis: []
  });

  // Initialize company and handle redirects
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/access-denied');
      return;
    }

    // Find the current company by slug
    const company = companies?.find(c => c.slug === slug);
    
    if (!company) {
      if (companies && companies.length === 1) {
        // If user has only one company, redirect to it
        navigate(`/client-portal/${companies[0].slug}`, { replace: true });
        return;
      } else if (!companies || companies.length === 0) {
        // No companies assigned
        setError('No company access assigned. Please contact your administrator.');
        setLoading(false);
        return;
      } else {
        // Multiple companies but invalid slug
        setError('Company not found or access denied.');
        setLoading(false);
        return;
      }
    }

    setCurrentCompany(company);
    
    // Log company access
    if (company) {
      activityLogger.logCompanyAccess(
        user.id, 
        user.email || '', 
        company.id, 
        company.name
      ).catch(console.error);
    }
  }, [authLoading, user, companies, slug, navigate]);

  // Load portal content using optimized RPC
  useEffect(() => {
    if (!currentCompany) return;

    const loadPortalContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure user membership for current company
        const { data: membershipData, error: membershipError } = await supabase
          .rpc('ensure_membership_for_current_user');

        if (membershipError) {
          console.error('Membership check failed:', membershipError);
        }

        // Load all content in a single optimized call
        const { data: contentData, error: contentError } = await supabase
          .rpc('get_company_portal_content', { p_company_id: currentCompany.id });

        if (contentError) {
          throw contentError;
        }

        // Type cast the JSON response
        const content = contentData as any;
        
        if (content?.error) {
          throw new Error(content.error);
        }

        // Set all content at once
        setPortalContent({
          announcements: content?.announcements || [],
          resources: content?.resources || [],
          useful_links: content?.useful_links || [],
          ai_tools: content?.ai_tools || [],
          faqs: content?.faqs || [],
          coaching: content?.coaching || [],
          kpis: content?.kpis || []
        });

        // Log portal view activity
        if (user?.id && user?.email) {
          activityLogger.logPortalView(
            user.id, 
            user.email, 
            currentCompany.id, 
            currentCompany.name,
            []
          ).catch(console.error);
        }

      } catch (error) {
        console.error('Portal content loading failed:', error);
        setError('Failed to load portal content. Please try again.');
        toast.error('Failed to load portal content');
      } finally {
        setLoading(false);
      }
    };

    loadPortalContent();
  }, [currentCompany, user]);

  const refresh = () => {
    if (currentCompany) {
      setLoading(true);
      setError(null);
      // The useEffect will trigger a reload
      setCurrentCompany({ ...currentCompany });
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );

  // Show loading spinner if still authenticating
  if (authLoading) {
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

  // Show loading while resolving company
  if (!currentCompany && !error) {
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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={refresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine user access level
  const isCompanyMember = companies?.some(c => c.id === currentCompany?.id);
  const isAdmin = userRole === 'Admin';
  const hasAccess = isAdmin || isCompanyMember;

  if (!hasAccess) {
    return <AccessDenied />;
  }

  const hasAnyContent = 
    portalContent.announcements.length > 0 || 
    portalContent.resources.length > 0 || 
    portalContent.useful_links.length > 0 || 
    portalContent.coaching.length > 0 || 
    portalContent.kpis.length > 0 || 
    portalContent.faqs.length > 0 || 
    portalContent.ai_tools.length > 0;

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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading portal content...</p>
          </div>
        )}

        {/* Portal Content */}
        {!loading && (
          <div className="space-y-8">
            {/* KPIs Section */}
            {portalContent.kpis.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Key Performance Indicators</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portalContent.kpis.map((kpi: any, index: number) => (
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
            {portalContent.coaching.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Upcoming Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {portalContent.coaching.map((session) => (
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
            {portalContent.announcements.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Announcements</h2>
                <div className="space-y-4">
                  {portalContent.announcements.map((announcement: any) => (
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
            {portalContent.resources.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portalContent.resources.map((resource: any) => (
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
            {portalContent.ai_tools.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">AI Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portalContent.ai_tools.map((tool: any) => (
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
            {portalContent.useful_links.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Useful Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portalContent.useful_links.map((link: any) => (
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

            {/* Show empty state if no content and not loading */}
            {!hasAnyContent && !loading && (
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