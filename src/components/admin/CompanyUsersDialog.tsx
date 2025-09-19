import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingIcon } from '@/components/LoadingSpinner';
import { Mail, Users } from 'lucide-react';

interface CompanyUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  companyName: string;
  companySlug?: string;
}

interface CompanyUserRecord {
  id: string;
  name: string | null;
  email: string | null;
  company_role: string | null;
  status: string | null;
}

interface SupabaseCompanyUser {
  user_id?: string | null;
  invitation_id?: string | null;
  email?: string | null;
  name?: string | null;
  company_role?: string | null;
  status?: string | null;
}

const roleBadgeClasses: Record<string, string> = {
  Admin: 'bg-forest-green/15 text-forest-green border border-forest-green/30',
  Owner: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20',
};

const CompanyUsersDialog: React.FC<CompanyUsersDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  companySlug,
}) => {
  const [members, setMembers] = useState<CompanyUserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!companyId || !open) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase.rpc('get_company_users_for_admin', {
          p_company_id: companyId,
        });

        if (fetchError) throw fetchError;

        const rawMembers = (data ?? []) as SupabaseCompanyUser[];
        const formattedMembers: CompanyUserRecord[] = rawMembers.map((member, index) => ({
          id: member.user_id || member.invitation_id || `${member.email ?? 'member'}-${index}`,
          name: member.name ?? null,
          email: member.email ?? null,
          company_role: member.company_role ?? 'Member',
          status: member.status ?? null,
        }));

        setMembers(formattedMembers);
      } catch (error) {
        console.error('Failed to load company members', error);
        const message = error instanceof Error ? error.message : 'Unable to load company members right now.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [companyId, open]);

  useEffect(() => {
    if (!open) {
      setMembers([]);
      setError(null);
    }
  }, [open]);

  const roleSummary = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const role = (member.company_role || 'Member').trim() || 'Member';
      counts.set(role, (counts.get(role) ?? 0) + 1);
    });
    return Array.from(counts.entries());
  }, [members]);

  const renderRoleBadge = (role: string | null) => {
    const normalizedRole = (role || 'Member').trim() || 'Member';
    const className = roleBadgeClasses[normalizedRole] ?? 'bg-muted text-muted-foreground border border-border/60';

    return (
      <Badge variant="outline" className={`text-xs font-medium ${className}`}>
        {normalizedRole}
      </Badge>
    );
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }

    if (email) {
      return email.charAt(0).toUpperCase();
    }

    return '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Company members</DialogTitle>
          <DialogDescription>
            {companyName ? (
              <div className="space-y-1">
                <span>People associated with {companyName}.</span>
                {companySlug && (
                  <span className="block text-xs text-muted-foreground">
                    Portal slug:{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5">/{companySlug}</code>
                  </span>
                )}
              </div>
            ) : (
              'Company members'
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingIcon size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-4 h-10 w-10 opacity-60" />
            <p>No users are currently associated with this company.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-forest-green" />
                <span>
                  {members.length} {members.length === 1 ? 'member' : 'members'} connected to this portal
                </span>
              </div>
              {roleSummary.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleSummary.map(([role, count]) => (
                    <Badge key={role} variant="outline" className="bg-background text-xs">
                      {role}
                      <span className="ml-1 text-muted-foreground">({count})</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <ScrollArea className="max-h-80 pr-4">
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start justify-between rounded-lg border bg-background p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-forest-green/10 text-forest-green">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">
                          {member.name || 'Unknown user'}
                        </p>
                        {member.email && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {renderRoleBadge(member.company_role)}
                      {member.status && (
                        <Badge variant="secondary" className="text-[11px]">
                          {member.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyUsersDialog;
