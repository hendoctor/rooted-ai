import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Eye, ExternalLink, ArrowRight } from 'lucide-react';
import { usePublicPortalContent } from '@/hooks/usePublicPortalContent';
import Header from '@/components/Header';
import { LoadingIcon } from '@/components/LoadingSpinner';

// NOTE: Ensure demo portal styling matches authenticated client dashboards for future updates.
// Lazy loaded components for better performance
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const PerformanceMetricCard = React.lazy(
  () => import('@/components/client-portal/PerformanceMetricCard')
);
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));
const AppCard = React.lazy(() => import('@/components/client-portal/AppCard'));
const FAQSection = React.lazy(() => import('@/components/client-portal/FAQSection'));
const EnhancedCoachingCard = React.lazy(
  () => import('@/components/client-portal/EnhancedCoachingCard')
);

const ClientDemoPortal: React.FC = () => {
  const { content, loading, error, refresh } = usePublicPortalContent();

  // Handle content error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Hub Content Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={refresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Hub Preview
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
    content.kpis.length > 0 ||
    content.faqs.length > 0 ||
    content.ai_tools.length > 0 ||
    content.apps.length > 0 ||
    content.coaching.length > 0;

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-20">
      <Header />
      
      {/* Hub Badge Banner */}
      <div className="border-b border-forest-green/20 bg-forest-green/5">
        <div className="container mx-auto py-4">
          <Alert className="border-forest-green/30 bg-forest-green/10">
            <Eye className="h-4 w-4 text-forest-green" />
            <AlertDescription className="flex items-center flex-wrap gap-4">
              <div className="text-forest-green">
                <strong>🚀 Live Hub Experience:</strong> You're previewing the RootedAI client hub.
                This showcases how prospects gain guided visibility into personalized growth dashboards.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
      
      <div className="container mx-auto py-8 space-y-8">
        {/* Portal Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-forest-green/10 text-forest-green border-forest-green/20">
              Hub Portal Preview
            </Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-forest-green">
            Client Hub Experience
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Immerse yourself in the RootedAI Hub to understand how prospects and clients activate a
            centralized, branded workspace tailored to their growth journey.
          </p>
        </div>

        {/* Content Loading State - Dashboard Skeleton */}
        {loading && (
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
        {!loading && (
          <div className="dashboard-layout">
            {/* Dashboard Grid Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Main Dashboard Area - Left Column */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* At-a-Glance Summary */}
                <Card className="bg-gradient-to-br from-forest-green/5 to-sage/10 border-forest-green/20 animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-black">Dashboard Overview</CardTitle>
                    <CardDescription>Sample intelligence from the RootedAI client hub ecosystem</CardDescription>
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
                        <div className="text-2xl font-bold text-forest-green">{content.apps.length}</div>
                        <div className="text-sm text-muted-foreground">Apps</div>
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
                      <h2 className="text-2xl font-semibold text-black">Performance Metrics</h2>
                      <Badge variant="outline" className="text-forest-green border-forest-green/30">Sample Hub Data</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {content.kpis.map((report: any, index: number) => (
                        <div
                          key={report.id || index}
                          className="animate-scale-in"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                            <PerformanceMetricCard report={report} />
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
                      <h2 className="text-2xl font-semibold text-black">Latest Updates</h2>
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
                    </div>
                  </div>
                )}

                {/* Resources Grid Widget */}
                {content.resources.length > 0 && (
                  <div className="animate-slide-up-delayed-2">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-black">Resource Library</h2>
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

                {/* FAQ Section */}
                {content.faqs.length > 0 && (
                  <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                    <FAQSection faqs={content.faqs} isDemo={true} />
                  </Suspense>
                )}

              </div>
              
              {/* Right Sidebar */}
              <div className="lg:col-span-4 space-y-6 flex flex-col">

                {/* Call to Action Card */}
                <Card className="order-last lg:order-first bg-gradient-to-br from-forest-green/15 to-forest-green/5 border-forest-green/20">
                  <CardHeader>
                    <CardTitle className="text-black">Ready to Activate Your Hub?</CardTitle>
                    <CardDescription>
                      Experience the full RootedAI client hub with personalized insights engineered for
                      your team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" asChild className="w-full border-forest-green text-forest-green hover:bg-forest-green/10">
                      <a href="https://rootedai.tech/#contact">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Contact Sales
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Coaching Sessions Widget */}
                {content.coaching.length > 0 && (
                  <div className="animate-slide-left">
                    <h3 className="text-lg font-semibold text-black mb-4">Upcoming Sessions</h3>
                    <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                      <EnhancedCoachingCard sessions={content.coaching} />
                    </Suspense>
                  </div>
                )}

                {/* AI Tools Widget */}
                {content.ai_tools.length > 0 && (
                  <div className="animate-slide-left-delayed">
                    <h3 className="text-lg font-semibold text-black mb-4">AI Toolkit</h3>
                    <div className="space-y-3">
                      {content.ai_tools.slice(0, 3).map((tool: any, index: number) => (
                        <div key={tool.id} className="animate-spring-up" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                            <div className="interactive-scale">
                              <AiToolCard
                                title={tool.ai_tool}
                                comments={tool.comments}
                                url={tool.url}
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

                {/* Apps Widget */}
                {content.apps.length > 0 && (
                  <div className="animate-slide-left-delayed">
                    <h3 className="text-lg font-semibold text-black mb-4">Available Apps</h3>
                    <div className="space-y-3">
                      {content.apps.slice(0, 3).map((app: any, index: number) => (
                        <div key={app.id} className="animate-spring-up" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                            <div className="interactive-scale">
                              <AppCard app={app} isDemo={true} />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                      {content.apps.length > 3 && (
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="p-3 text-center">
                            <p className="text-muted-foreground text-xs">
                              +{content.apps.length - 3} more apps
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
                    <h3 className="text-lg font-semibold text-black mb-4">Quick Access</h3>
                    <div className="space-y-2">
                      {content.useful_links.slice(0, 4).map((link: any, index: number) => (
                        <div key={link.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                            <div className="interactive-scale">
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

              </div>
            </div>
          </div>
        )}

        {/* Empty State for No Content */}
        {!loading && !hasAnyContent && (
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="py-12">
              <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hub Content Loading</h3>
              <p className="text-muted-foreground mb-6">
                The hub content is being prepared. In a live RootedAI environment, you'd see
                personalized announcements, resources, and tools curated specifically for your
                organization.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Hub Preview
                </Button>
                <Button variant="outline" asChild>
                  <a href="/auth">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    See Real Portal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Footer */}
        <Card className="bg-gradient-to-r from-forest-green/5 to-sage/10 border-forest-green/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-semibold text-black mb-2">
              Ready to Transform Your Business?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              This hub preview highlights how RootedAI curates intelligence, automation, and client
              collaboration in one place. Launch your own branded hub with content tailored to your
              business needs.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button variant="outline" size="lg" asChild className="border-forest-green text-forest-green hover:bg-forest-green/10">
                <a href="https://rootedai.tech/#contact">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Book a Discovery Call
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDemoPortal;