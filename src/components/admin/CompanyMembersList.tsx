import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, RefreshCw, Eye, Mail } from 'lucide-react';
import { LoadingIcon } from '@/components/LoadingSpinner';
import { toast } from 'sonner';

interface CompanyMember {
  user_id: string;
  display_name: string;
  member_role: string;
  email?: string;
  joined_date?: string;
}

interface CompanyMembersListProps {
  companyId: string;
  companyName: string;
}

export const CompanyMembersList: React.FC<CompanyMembersListProps> = ({ 
  companyId, 
  companyName 
}) => {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_company_members_minimal', {
        p_company_id: companyId
      });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching company members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchMembers();
    }
  }, [companyId]);

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'Admin' ? 'default' : 'secondary'}>
        {role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members - {companyName}
          </CardTitle>
          <CardDescription>
            View your company team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingIcon size="lg" />
          </div>
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
              <Users className="h-5 w-5" />
              Team Members - {companyName}
            </CardTitle>
            <CardDescription>
              View your company team members ({members.length} members)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-forest-green/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-forest-green" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.display_name || 'Unknown User'}
                    </div>
                    {member.email && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(member.member_role)}
                  {member.joined_date && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(member.joined_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};