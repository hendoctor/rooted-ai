import React, { useState, useMemo } from 'react';
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

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

function get(obj: unknown, path: string) {
  return path
    .split('.')
    .reduce<unknown>((o, p) => (typeof o === 'object' && o !== null ? (o as Record<string, unknown>)[p] : undefined), obj) ?? '';
}

export function SortableTable<T extends { id: string }>({ data, columns }: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key);
  const [asc, setAsc] = useState(true);
  const [visible, setVisible] = useState<string[]>(columns.map(c => c.key));
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    columns.forEach(c => {
      init[c.key] = c.initialWidth ?? 150;
    });
    return init;
  });

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

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widths[key];
    const onMouseMove = (eMove: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (eMove.clientX - startX));
      setWidths(w => ({ ...w, [key]: newWidth }));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const visibleCols = columns.filter(c => visible.includes(c.key));

  return (
    <div>
      <div className="flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visible.includes(col.key)}
                onCheckedChange={(checked) =>
                  setVisible(v =>
                    checked ? [...v, col.key] : v.filter(k => k !== col.key)
                  )
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="h-52">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {visibleCols.map(col => (
                <TableHead
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={col.sortable === false ? '' : 'cursor-pointer select-none relative'}
                  style={{ width: widths[col.key] }}
                >
                  {col.label}{sortKey === col.key && (asc ? ' ▲' : ' ▼')}
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(e) => startResize(e, col.key)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(item => (
              <TableRow key={item.id}>
                {visibleCols.map(col => (
                  <TableCell key={col.key} style={{ width: widths[col.key] }}>
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
}

export default SortableTable;
