import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, RefreshCw, AlertCircle, Building2, Plus } from 'lucide-react';
import PortalStatsCard from './PortalStatsCard';
import { useToast } from '@/hooks/use-toast';

interface PortalStats {
  company_id: string;
  company_name: string;
  company_slug: string;
  user_count: number;
  announcement_count: number;
  resource_count: number;
  useful_link_count: number;
  ai_tool_count: number;
  faq_count: number;
  coaching_count: number;
  kpi_count: number;
  last_updated: string;
}

interface AdminPortalPreviewProps {
  onAddCompany?: () => void;
  onEditCompany?: (company: { id: string; name: string; slug: string }) => void;
  onDeleteCompany?: (id: string) => void;
  onManageUsers?: (company: { id: string; name: string; slug: string }) => void;
}

const AdminPortalPreview: React.FC<AdminPortalPreviewProps> = ({ 
  onAddCompany, 
  onEditCompany, 
  onDeleteCompany, 
  onManageUsers 
}) => {
  const [portalStats, setPortalStats] = useState<PortalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchPortalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_admin_portal_stats');

      if (fetchError) {
        throw fetchError;
      }

      setPortalStats(data || []);
    } catch (err) {
      console.error('Failed to fetch portal stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load portal statistics';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load portal statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalStats();
  }, []);

  const filteredStats = portalStats.filter(stats =>
    stats.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stats.company_slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    fetchPortalStats();
    toast({
      title: "Portal stats refreshed",
      description: "Latest portal statistics have been loaded",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Portals
          </CardTitle>
          <CardDescription>
            Loading portal statistics...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Portals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Portals
            </CardTitle>
            <CardDescription>
              Access and manage all registered company portals ({portalStats.length} total)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onAddCompany} variant="default" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {portalStats.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search companies or slugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredStats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {searchTerm ? (
              <>
                <h3 className="text-lg font-medium mb-2">No portals found</h3>
                <p>No portals match "{searchTerm}"</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No company portals</h3>
                <p>Create companies to see their portals here</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStats.map((stats) => (
              <PortalStatsCard 
                key={stats.company_id} 
                stats={stats}
                onEditCompany={onEditCompany}
                onDeleteCompany={onDeleteCompany}
                onManageUsers={onManageUsers}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPortalPreview;