import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Smartphone } from "lucide-react";

interface App {
  id: string;
  name: string;
  url: string;
  description?: string;
  demo_preview?: boolean;
}

interface AppCardProps {
  app: App;
  isDemo?: boolean;
}

const AppCard: React.FC<AppCardProps> = ({ app, isDemo = false }) => {
  const handleAppClick = () => {
    // Open app in new tab
    window.open(app.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group border-forest-green/30 bg-card"
      onClick={handleAppClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-forest-green" />
            <CardTitle className="text-lg text-forest-green dark:text-sage transition-colors">
              {app.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="secondary" className="text-xs">
                Demo
              </Badge>
            )}
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-forest-green transition-colors" />
          </div>
        </div>
      </CardHeader>
      
      {app.description && (
        <CardContent>
          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
            {app.description}
          </CardDescription>
        </CardContent>
      )}
      
      {isDemo && (
        <div className="absolute inset-0 bg-gradient-to-br from-forest-green/5 to-sage/10 rounded-lg pointer-events-none" />
      )}
    </Card>
  );
};

export default AppCard;