import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  initialWidth?: number;
}

export interface TableConfig {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  sortKey?: string;
  sortAsc?: boolean;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  toolbar?: (columnsButton: React.ReactNode) => React.ReactNode;
  defaultSortKey?: string;
  defaultAsc?: boolean;
  rowClassName?: (item: T) => string;
  scrollAreaClassName?: string;
  externalConfig?: TableConfig;
  onConfigChange?: (config: TableConfig) => void;
}

function get(obj: unknown, path: string) {
  return path
    .split('.')
    .reduce<unknown>((o, p) => (typeof o === 'object' && o !== null ? (o as Record<string, unknown>)[p] : undefined), obj) ?? '';
}

export const SortableTable = React.memo(<T extends { id: string }>({
  data,
  columns,
  toolbar,
  defaultSortKey,
  defaultAsc = true,
  rowClassName,
  scrollAreaClassName,
  externalConfig,
  onConfigChange,
}: SortableTableProps<T>) => {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey || columns[0]?.key);
  const [asc, setAsc] = useState(defaultAsc);
  const [visible, setVisible] = useState<string[]>(columns.map(c => c.key));
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    columns.forEach(c => {
      init[c.key] = c.initialWidth ?? 150;
    });
    return init;
  });

  // Refs to prevent feedback loops
  const isApplyingExternalConfig = useRef(false);
  const configChangeTimeoutRef = useRef<NodeJS.Timeout>();

  // Apply external configuration when it changes
  useEffect(() => {
    if (externalConfig && !isApplyingExternalConfig.current) {
      isApplyingExternalConfig.current = true;
      
      startTransition(() => {
        setVisible(externalConfig.visibleColumns);
        setWidths(externalConfig.columnWidths);
        setSortKey(externalConfig.sortKey || columns[0]?.key);
        setAsc(externalConfig.sortAsc ?? true);
      });

      // Reset flag after state updates are applied
      const timer = setTimeout(() => {
        isApplyingExternalConfig.current = false;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [externalConfig, columns]);

  // Debounced configuration change emission
  const emitConfigChange = useCallback(() => {
    if (onConfigChange && !isApplyingExternalConfig.current) {
      if (configChangeTimeoutRef.current) {
        clearTimeout(configChangeTimeoutRef.current);
      }
      
      configChangeTimeoutRef.current = setTimeout(() => {
        const config: TableConfig = {
          visibleColumns: visible,
          columnWidths: widths,
          sortKey,
          sortAsc: asc,
        };
        onConfigChange(config);
      }, 100); // 100ms debounce
    }
  }, [visible, widths, sortKey, asc, onConfigChange]);

  // Emit configuration changes with debouncing
  useEffect(() => {
    emitConfigChange();
    return () => {
      if (configChangeTimeoutRef.current) {
        clearTimeout(configChangeTimeoutRef.current);
      }
    };
  }, [emitConfigChange]);

  const sorted = useMemo(() => {
    const items = [...data];
    if (sortKey) {
      items.sort((a, b) => {
        const aVal = get(a, sortKey);
        const bVal = get(b, sortKey);
        if (aVal < bVal) return asc ? -1 : 1;
        if (aVal > bVal) return asc ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, sortKey, asc]);

  const visibleCols = useMemo(() => 
    columns.filter(c => visible.includes(c.key)), 
    [columns, visible]
  );

  const handleSort = useCallback((key: string) => {
    startTransition(() => {
      if (sortKey === key) {
        setAsc(!asc);
      } else {
        setSortKey(key);
        setAsc(true);
      }
    });
  }, [sortKey, asc]);

  const startResize = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widths[key];
    
    const onMouseMove = (eMove: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (eMove.clientX - startX));
      // Batch width updates to prevent excessive re-renders
      startTransition(() => {
        setWidths(w => ({ ...w, [key]: newWidth }));
      });
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  const handleColumnToggle = useCallback((colKey: string, checked: boolean) => {
    startTransition(() => {
      setVisible(v =>
        checked ? [...v, colKey] : v.filter(k => k !== colKey)
      );
    });
  }, []);

  const columnsButton = useMemo(() => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto border-forest-green text-forest-green hover:bg-forest-green/10 transition-colors"
        >
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {columns.map(col => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visible.includes(col.key)}
            onCheckedChange={(checked) => handleColumnToggle(col.key, checked)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ), [columns, visible, handleColumnToggle]);

  return (
    <div className="transition-opacity duration-200">
      {toolbar ? (
        toolbar(columnsButton)
      ) : (
        <div className="flex justify-end mb-2">{columnsButton}</div>
      )}
      <ScrollArea className={scrollAreaClassName || "h-80"}>
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {visibleCols.map(col => (
                <TableHead
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={
                    (col.sortable === false ? '' : 'cursor-pointer select-none relative') +
                    ' border border-border transition-all duration-200'
                  }
                  style={{ 
                    width: widths[col.key], 
                    transition: 'width 0.2s ease-out' 
                  }}
                >
                  {col.label}{sortKey === col.key && (asc ? ' ▲' : ' ▼')}
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => startResize(e, col.key)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(item => (
              <TableRow 
                key={item.id} 
                className={`h-12 transition-colors duration-150 ${rowClassName ? rowClassName(item) : ''}`}
              >
                {visibleCols.map(col => (
                  <TableCell 
                    key={col.key} 
                    style={{ 
                      width: widths[col.key], 
                      transition: 'width 0.2s ease-out' 
                    }} 
                    className="border border-border py-2 px-3"
                  >
                    {col.render ? col.render(item) : String(get(item, col.key))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}) as <T extends { id: string }>(props: SortableTableProps<T>) => React.ReactElement;

export default SortableTable;
