import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TenantSecurityManager } from '@/utils/tenantSecurity';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Shield, Eye, Download } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  created_at: string;
  user_id?: string;
}

export const SecurityAuditPanel = () => {
  const { userRole, companies } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousUsers, setSuspiciousUsers] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Only show for admins
  if (userRole !== 'Admin') {
    return null;
  }

  useEffect(() => {
    loadSecurityEvents();
    detectSuspiciousActivity();
  }, [selectedCompany]);

  const loadSecurityEvents = async () => {
    try {
      setLoading(true);
      
      if (selectedCompany) {
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        const endDate = new Date();
        
        const auditData = await TenantSecurityManager.generateAuditReport(
          selectedCompany,
          startDate,
          endDate
        );
        
        setEvents(auditData);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectSuspiciousActivity = async () => {
    try {
      // This would need to be implemented with proper user data
      // For now, we'll check if there are any unauthorized access attempts
      const suspicious = events
        .filter(event => event.event_type === 'unauthorized_tenant_access')
        .map(event => event.user_id)
        .filter(Boolean) as string[];
      
      setSuspiciousUsers([...new Set(suspicious)]);
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
    }
  };

  const getEventSeverity = (eventType: string): 'low' | 'medium' | 'high' => {
    const highSeverity = ['unauthorized_tenant_access', 'data_breach_attempt', 'session_hijack'];
    const mediumSeverity = ['failed_login_attempt', 'permission_escalation'];
    
    if (highSeverity.includes(eventType)) return 'high';
    if (mediumSeverity.includes(eventType)) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const exportAuditReport = async () => {
    if (!selectedCompany) return;
    
    try {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const endDate = new Date();
      
      const auditData = await TenantSecurityManager.generateAuditReport(
        selectedCompany,
        startDate,
        endDate
      );
      
      const csvContent = [
        'Timestamp,Event Type,User ID,Details',
        ...auditData.map(event => 
          `${event.created_at},${event.event_type},${event.user_id || 'N/A'},"${JSON.stringify(event.event_details)}"`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-audit-${selectedCompany}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Audit Panel
              </CardTitle>
              <CardDescription>
                Monitor security events and tenant access patterns
              </CardDescription>
            </div>
            <Button onClick={exportAuditReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Company selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Company</label>
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Suspicious activity alert */}
            {suspiciousUsers.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {suspiciousUsers.length} user(s) with suspicious activity detected in the last 24 hours.
                </AlertDescription>
              </Alert>
            )}

            {/* Security events list */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Recent Security Events
              </h4>
              
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading security events...
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No security events found
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events.slice(0, 20).map(event => {
                    const severity = getEventSeverity(event.event_type);
                    
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(severity)} className="text-xs">
                              {severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium text-sm">
                              {event.event_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                          {event.event_details && (
                            <div className="text-xs mt-1 text-muted-foreground">
                              {JSON.stringify(event.event_details, null, 2).substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};