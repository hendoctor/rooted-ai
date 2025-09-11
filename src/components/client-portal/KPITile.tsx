import React from 'react';

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
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-sage/20 dark:border-sage/30">
      <div className="text-xs text-slate-gray dark:text-slate-300 mb-1">{label}</div>
      <div className="text-xl font-bold text-forest-green dark:text-sage">
        {value}
        {target ? `/${target}` : ''}
      </div>
      <div className="mt-2 h-1.5 bg-sage/20 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-forest-green dark:bg-sage"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default KPITile;
