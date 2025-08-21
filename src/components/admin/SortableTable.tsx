import React, { useState, useMemo } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
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

  return (
    <ScrollArea className="h-52">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => (
              <TableHead
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={col.sortable === false ? '' : 'cursor-pointer select-none'}
              >
                {col.label}{sortKey === col.key && (asc ? ' ▲' : ' ▼')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(item => (
            <TableRow key={item.id}>
              {columns.map(col => (
                <TableCell key={col.key}>
                  {col.render ? col.render(item) : String(get(item, col.key))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default SortableTable;
