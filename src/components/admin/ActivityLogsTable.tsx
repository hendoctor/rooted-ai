import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, RefreshCw, Download, Eye, User, Building2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import SortableTable, { Column } from '@/components/admin/SortableTable';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  company_id?: string | null;
  company_name?: string | null;
  activity_type: string;
  activity_description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata: Record<string, unknown>; // Using Record to handle Supabase Json type
  created_at: string;
}

interface ActivityLogsTableProps {
  className?: string;
}

const ActivityLogsTable: React.FC<ActivityLogsTableProps> = ({ className }) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState({
    userEmail: '',
    activityType: '',
    companyId: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const { toast } = useToast();

  // Activity type options
  const activityTypes = [
    'LOGIN',
    'LOGOUT', 
    'PAGE_VIEW',
    'DATA_ACCESS',
    'ADMIN_ACTION',
    'COMPANY_ACCESS',
    'PORTAL_VIEW',
    'SETTINGS_CHANGE',
    'USER_MANAGEMENT',
    'INVITATION_SENT',
    'INVITATION_ACCEPTED'
  ];

  // Load companies for filter dropdown
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        
        if (!error && data) {
          setCompanies(data);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
      }
    };
    
    loadCompanies();
  }, []);

  // Load activity logs
  const loadActivityLogs = async (page = 1) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      
      let query = supabase
        .from('activity_logs')
        .select('*');
      
      // Apply filters conditionally
      if (filters.userEmail) {
        query = query.ilike('user_email', `%${filters.userEmail}%`);
      }
      
      if (filters.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }
      
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // Get total count for pagination with same filters
      let countQuery = supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });
      
      // Apply same filters for count
      if (filters.userEmail) {
        countQuery = countQuery.ilike('user_email', `%${filters.userEmail}%`);
      }
      
      if (filters.activityType) {
        countQuery = countQuery.eq('activity_type', filters.activityType);
      }
      
      if (filters.companyId) {
        countQuery = countQuery.eq('company_id', filters.companyId);
      }
      
      if (filters.startDate) {
        countQuery = countQuery.gte('created_at', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        countQuery = countQuery.lte('created_at', filters.endDate.toISOString());
      }
      
      const { count } = await countQuery;

      setActivityLogs((data || []) as ActivityLog[]);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadActivityLogs(currentPage);
    toast({
      title: 'Activity logs refreshed',
      description: 'Latest activity logs loaded',
    });
  };

  // Load data on mount and filter changes
  useEffect(() => {
    loadActivityLogs(1);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (
    key: string,
    value: string | Date | null
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      userEmail: '',
      activityType: '',
      companyId: '',
      startDate: null,
      endDate: null
    });
  };

  // Format activity type for display
  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get activity type color
  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'LOGIN': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'ADMIN_ACTION': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'COMPANY_ACCESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PORTAL_VIEW': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Define table columns
  const columns: Column<ActivityLog>[] = [
    {
      key: 'created_at',
      label: 'Date & Time',
      render: (log) => (
        <div className="text-sm">
          <div className="font-medium">
            {format(new Date(log.created_at), 'MMM dd, yyyy')}
          </div>
          <div className="text-muted-foreground">
            {format(new Date(log.created_at), 'hh:mm a')}
          </div>
        </div>
      ),
      initialWidth: 120,
    },
    {
      key: 'user_email',
      label: 'User',
      render: (log) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{log.user_email}</span>
        </div>
      ),
      initialWidth: 200,
    },
    {
      key: 'activity_type',
      label: 'Activity',
      render: (log) => (
        <Badge className={cn("text-xs", getActivityTypeColor(log.activity_type))}>
          {formatActivityType(log.activity_type)}
        </Badge>
      ),
      initialWidth: 130,
    },
    {
      key: 'activity_description',
      label: 'Description',
      render: (log) => (
        <span className="text-sm text-muted-foreground">
          {log.activity_description || 'No description'}
        </span>
      ),
      initialWidth: 250,
    },
    {
      key: 'company_name',
      label: 'Company',
      render: (log) => (
        log.company_name ? (
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{log.company_name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
      ),
      initialWidth: 150,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (log) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity Log Details</DialogTitle>
              <DialogDescription>
                Detailed information about this activity log entry
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date & Time</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User Email</label>
                    <p className="text-sm text-muted-foreground">{log.user_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Activity Type</label>
                    <p className="text-sm text-muted-foreground">{formatActivityType(log.activity_type)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <p className="text-sm text-muted-foreground">{log.company_name || 'N/A'}</p>
                  </div>
                </div>
                
                {log.activity_description && (
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground">{log.activity_description}</p>
                  </div>
                )}
                
                {log.ip_address && (
                  <div>
                    <label className="text-sm font-medium">IP Address</label>
                    <p className="text-sm text-muted-foreground">{log.ip_address}</p>
                  </div>
                )}
                
                {log.user_agent && (
                  <div>
                    <label className="text-sm font-medium">User Agent</label>
                    <p className="text-sm text-muted-foreground break-all">{log.user_agent}</p>
                  </div>
                )}
                
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Metadata</label>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ),
      initialWidth: 80,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Logs
            </CardTitle>
            <CardDescription>
              Monitor user authentication and activity across your platform.
              Showing {activityLogs.length} of {totalCount} activities.
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full lg:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="min-w-[200px]">
            <Input
              placeholder="Filter by user email..."
              value={filters.userEmail}
              onChange={(e) => handleFilterChange('userEmail', e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select
            value={filters.activityType}
            onValueChange={(value) => handleFilterChange('activityType', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Activity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {formatActivityType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.companyId}
            onValueChange={(value) => handleFilterChange('companyId', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? format(filters.startDate, 'MMM dd, yyyy') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => handleFilterChange('startDate', date)}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? format(filters.endDate, 'MMM dd, yyyy') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => handleFilterChange('endDate', date)}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={clearFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>

        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading activity logs...</span>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-6 w-6 mr-2" />
            No activity logs found
          </div>
        ) : (
          <SortableTable
            data={activityLogs}
            columns={columns}
            defaultSortKey="created_at"
            defaultAsc={false}
            rowClassName={(log) => log.company_id ? 'bg-forest-green/10 dark:bg-forest-green/20' : ''}
            scrollAreaClassName="h-96"
          />
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} activities
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => loadActivityLogs(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * pageSize >= totalCount}
                onClick={() => loadActivityLogs(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogsTable;