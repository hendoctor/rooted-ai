import { useEffect } from 'react';
import { useSecureSession } from '@/hooks/useSecureSession';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Lightweight session security notifier. Uses existing design system toasts.
const SessionSecurity = () => {
  const { sessionWarning, dismissWarning, extendSession } = useSecureSession();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionWarning) return;

    const title = sessionWarning.type === 'idle' ? 'You are idle' : 'Session expiring soon';
    const actionLabel = sessionWarning.type === 'idle' ? 'Stay signed in' : 'Extend session';

    toast({
      title,
      description: sessionWarning.message,
      action: (
        <ToastAction altText={actionLabel} onClick={extendSession}>
          {actionLabel}
        </ToastAction>
      ),
    });

    // Dismiss internal state after showing the toast
    // The toast has its own lifecycle; we just want to avoid duplicates
    const id = setTimeout(() => dismissWarning(), 0);
    return () => clearTimeout(id);
  }, [sessionWarning, toast, dismissWarning, extendSession]);

  return null;
};

export default SessionSecurity;
