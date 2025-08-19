import React from 'react';

interface KPITileProps {
  label: string;
  value: string;
}

const KPITile: React.FC<KPITileProps> = ({ label, value }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-sage/20">
      <div className="text-xs text-slate-gray mb-1">{label}</div>
      <div className="text-xl font-bold text-forest-green">{value}</div>
      <div className="mt-2 h-1.5 bg-sage/20 rounded-full overflow-hidden">
        <div className="h-full bg-forest-green" style={{ width: '50%' }}></div>
      </div>
    </div>
  );
};

export default KPITile;
