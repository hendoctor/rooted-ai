import { useTable } from '@/hooks/useTable';

interface Announcement {
  id: string;
  title?: string;
}

const PublicAnnouncements = () => {
  const { data = [], showCachedHint } = useTable<Announcement>({
    table: 'announcements',
    role: 'public',
    userId: 'anon',
  });

  return (
    <section className="p-4">
      {showCachedHint && (
        <p className="text-xs text-muted-foreground mb-2">Showing cached data (network issue)</p>
      )}
      <ul className="space-y-1">
        {data.map((a) => (
          <li key={a.id}>{a.title || a.id}</li>
        ))}
      </ul>
    </section>
  );
};

export default PublicAnnouncements;
