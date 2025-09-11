import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface KPITileProps {
  label: string;
  value: string;
  target?: string;
}

const KPITile: React.FC<KPITileProps> = ({ label, value, target }) => {
  const valueNum = parseFloat(value);
  const targetNum = target ? parseFloat(target) : NaN;
  const progress =
    !isNaN(valueNum) && !isNaN(targetNum) && targetNum > 0
      ? Math.min(100, (valueNum / targetNum) * 100)
      : 0;

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-background to-muted/20 border-forest-green/20 hover:border-forest-green/40 transition-all duration-300 hover:shadow-lg hover:shadow-forest-green/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="w-2 h-2 bg-forest-green/40 rounded-full group-hover:bg-forest-green transition-colors" />
        </div>
        
        <div className="space-y-3">
          <div className="text-3xl font-bold text-forest-green">
            {value}
            {target && <span className="text-lg text-muted-foreground ml-1">/{target}</span>}
          </div>
          
          {target && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-forest-green to-sage transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest-green/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </CardContent>
    </Card>
  );
};

export default KPITile;
