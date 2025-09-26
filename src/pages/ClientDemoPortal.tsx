import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Eye, ExternalLink, User, ArrowRight } from 'lucide-react';
import { usePublicPortalContent } from '@/hooks/usePublicPortalContent';
import Header from '@/components/Header';
import { LoadingIcon } from '@/components/LoadingSpinner';

// Lazy loaded components for better performance
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const PerformanceMetricCard = React.lazy(
  () => import('@/components/client-portal/PerformanceMetricCard')
);
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));

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
                Demo Content Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={refresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Demo
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
    content.ai_tools.length > 0;

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-20">
      <Header />
      
      {/* Demo Badge Banner */}
      <div className="border-b border-primary/20 bg-primary/5">
        <div className="container mx-auto py-4">
          <Alert className="border-primary/30 bg-primary/10">
            <Eye className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-primary">
                <strong>🚀 Live Demo Experience:</strong> You're viewing a sample client portal. 
                This showcases what RootedAI clients see in their personalized dashboards.
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="border-primary/30 text-primary hover:bg-primary/20"
                >
                  <a href="/auth">
                    <User className="w-4 h-4 mr-2" />
                    Get Started
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="border-primary/30 text-primary hover:bg-primary/20"
                >
                  <a href="#contact">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contact Us
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
      
      <div className="container mx-auto py-8 space-y-8">
        {/* Portal Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Demo Portal
            </Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Client Experience Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore what it's like to be a RootedAI client with this interactive demo portal. 
            See real content, tools, and resources in action.
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
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-primary">Demo Dashboard Overview</CardTitle>
                    <CardDescription>Sample content from our client portal system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{content.announcements.length}</div>
                        <div className="text-sm text-muted-foreground">Announcements</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{content.resources.length}</div>
                        <div className="text-sm text-muted-foreground">Resources</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{content.ai_tools.length}</div>
                        <div className="text-sm text-muted-foreground">AI Tools</div>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{content.useful_links.length}</div>
                        <div className="text-sm text-muted-foreground">Quick Links</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPIs Dashboard Widget */}
                {content.kpis.length > 0 && (
                  <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-primary">Performance Metrics</h2>
                      <Badge variant="outline" className="text-primary border-primary/20">Demo Data</Badge>
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
                      <h2 className="text-2xl font-semibold text-primary">Latest Updates</h2>
                      <Badge variant="outline" className="text-primary border-primary/20">
                        {content.announcements.length} demo updates
                      </Badge>
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

              </div>
              
              {/* Right Sidebar */}
              <div className="lg:col-span-4 space-y-6">

                {/* Call to Action Card */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-primary">Ready to Get Started?</CardTitle>
                    <CardDescription>
                      Experience the full RootedAI client portal with your own personalized content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button asChild className="w-full">
                      <a href="/auth">
                        <User className="w-4 h-4 mr-2" />
                        Create Your Account
                      </a>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <a href="#contact">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Contact Sales
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Resources Widget */}
                {content.resources.length > 0 && (
                  <div className="animate-slide-up-delayed-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-primary">Sample Resources</h3>
                      <Badge variant="outline" className="text-primary border-primary/20">Demo</Badge>
                    </div>
                    <div className="space-y-3">
                      {content.resources.slice(0, 3).map((resource: any, index: number) => (
                        <div key={resource.id} className="animate-fade-in" style={{ animationDelay: `${(index + 4) * 0.1}s` }}>
                          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                            <div className="interactive-scale">
                              <ResourceCard 
                                title={resource.title}
                                type={resource.category === 'Video' ? 'Video' : resource.category === 'Slide' ? 'Slide' : 'Guide'}
                                href={resource.link}
                              />
                            </div>
                          </Suspense>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Tools Widget */}
                {content.ai_tools.length > 0 && (
                  <div className="animate-slide-up-delayed-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-primary">Demo AI Tools</h3>
                      <Badge variant="outline" className="text-primary border-primary/20">Sample</Badge>
                    </div>
                    <div className="space-y-3">
                      {content.ai_tools.slice(0, 3).map((tool: any, index: number) => (
                        <div key={tool.id} className="animate-fade-in" style={{ animationDelay: `${(index + 7) * 0.1}s` }}>
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
                    </div>
                  </div>
                )}

                {/* Quick Links Widget */}
                {content.useful_links.length > 0 && (
                  <div className="animate-slide-up-delayed-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-primary">Demo Quick Links</h3>
                      <Badge variant="outline" className="text-primary border-primary/20">Sample</Badge>
                    </div>
                    <div className="space-y-3">
                      {content.useful_links.slice(0, 3).map((link: any, index: number) => (
                        <div key={link.id} className="animate-fade-in" style={{ animationDelay: `${(index + 10) * 0.1}s` }}>
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
              <h3 className="text-lg font-semibold mb-2">Demo Content Loading</h3>
              <p className="text-muted-foreground mb-6">
                The demo content is being prepared. In a real client portal, you'd see personalized 
                announcements, resources, and tools curated specifically for your organization.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Demo
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
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-semibold text-primary mb-2">
              Ready to Transform Your Business?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              This demo showcases just a glimpse of what RootedAI can offer. Get your own 
              personalized client portal with content tailored to your business needs.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg">
                <a href="/auth">
                  <User className="w-5 h-5 mr-2" />
                  Start Your Journey
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#contact">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Schedule a Demo
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