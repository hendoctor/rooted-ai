import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Users, FileText, MessageSquare, Brain, HelpCircle, GraduationCap, BarChart3, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface PortalStatsCardProps {
  stats: PortalStats;
  onEditCompany?: (company: { id: string; name: string; slug: string }) => void;
  onDeleteCompany?: (id: string) => void;
  onManageUsers?: (company: { id: string; name: string; slug: string }) => void;
}

const PortalStatsCard: React.FC<PortalStatsCardProps> = ({ stats, onEditCompany, onDeleteCompany, onManageUsers }) => {
  const totalContent = stats.announcement_count + stats.resource_count + stats.useful_link_count + 
                      stats.ai_tool_count + stats.faq_count + stats.coaching_count + stats.kpi_count;

  const lastUpdated = new Date(stats.last_updated).toLocaleDateString();

  const contentItems = [
    { icon: FileText, count: stats.announcement_count, label: 'Announcements', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    { icon: MessageSquare, count: stats.resource_count, label: 'Resources', color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
    { icon: ExternalLink, count: stats.useful_link_count, label: 'Links', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
    { icon: Brain, count: stats.ai_tool_count, label: 'AI Tools', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
    { icon: HelpCircle, count: stats.faq_count, label: 'FAQs', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' },
    { icon: GraduationCap, count: stats.coaching_count, label: 'Coaching', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
    { icon: BarChart3, count: stats.kpi_count, label: 'KPIs', color: 'bg-red-500/10 text-red-700 dark:text-red-300' }
  ];

  return (
    <Card className="relative overflow-hidden border border-border/50 hover:border-border transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{stats.company_name}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">/{stats.company_slug}</code>
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {stats.user_count} {stats.user_count === 1 ? 'user' : 'users'}
            </Badge>
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Content Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Content</span>
          <Badge variant={totalContent > 0 ? "default" : "secondary"}>
            {totalContent} items
          </Badge>
        </div>

        {/* Content Breakdown */}
        {totalContent > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {contentItems.filter(item => item.count > 0).map((item) => (
              <div key={item.label} className={`flex items-center gap-2 p-2 rounded-lg ${item.color}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.count}</span>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {totalContent === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No content assigned</p>
          </div>
        )}

        {/* Management Actions */}
        <div className="pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full text-xs"
            >
              <Link
                to={`/${stats.company_slug}`}
                className="flex items-center justify-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Portal
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageUsers?.({ 
                id: stats.company_id, 
                name: stats.company_name, 
                slug: stats.company_slug 
              })}
              className="w-full text-xs"
            >
              <Users className="w-3 h-3 mr-1" />
              Users
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditCompany?.({ 
                id: stats.company_id, 
                name: stats.company_name, 
                slug: stats.company_slug 
              })}
              className="w-full text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteCompany?.(stats.company_id)}
              className="w-full text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="pt-2 border-t border-border/50 mt-4">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortalStatsCard;