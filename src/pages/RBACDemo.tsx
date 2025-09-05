import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMutation } from '@/hooks/useMutation';
import { canCRUD, Role } from '@/lib/rbac';
import { cacheClient } from '@/lib/cacheClient';

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

const RBACDemo: React.FC = () => {
  const { userRole } = useAuth();
  const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;

  const { data, loading, error, refetch } = useCachedQuery<Todo>(
    'todo',
    'https://jsonplaceholder.typicode.com/todos/1',
    { strategy: 'stale-while-revalidate', ttl: 10000 }
  );

  const createTodo = useMutation({ method: 'POST', invalidate: 'todo' });
  const updateTodo = useMutation({ method: 'PUT', invalidate: 'todo' });
  const deleteTodo = useMutation({ method: 'DELETE', invalidate: 'todo' });

  const canCreate = canCRUD(role, 'todos', 'create');
  const canUpdate = canCRUD(role, 'todos', 'update');
  const canDelete = canCRUD(role, 'todos', 'delete');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">RBAC & Cache Demo</h1>
      <p className="text-sm text-muted-foreground">Current role: {userRole}</p>

      <div>
        {loading && <p>Loading...</p>}
        {error && <p className="text-destructive">{error.message}</p>}
        {data && (
          <pre className="bg-muted p-4 rounded-md overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() =>
            createTodo.mutate('https://jsonplaceholder.typicode.com/todos', {
              title: 'New todo',
              completed: false
            })
          }
          disabled={!canCreate}
        >
          Create
        </Button>
        <Button
          onClick={() =>
            updateTodo.mutate('https://jsonplaceholder.typicode.com/todos/1', {
              title: 'Updated',
              completed: true
            })
          }
          disabled={!canUpdate}
        >
          Update
        </Button>
        <Button
          onClick={() =>
            deleteTodo.mutate('https://jsonplaceholder.typicode.com/todos/1')
          }
          disabled={!canDelete}
          variant="destructive"
        >
          Delete
        </Button>
        <Button variant="outline" onClick={() => { cacheClient.invalidate('todo'); refetch(); }}>
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default RBACDemo;
