import { VapidKeyGenerator } from '@/components/VapidKeyGenerator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VapidSetup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">VAPID Keys Setup</h1>
          <p className="text-muted-foreground">
            Generate and configure VAPID keys for push notifications
          </p>
        </div>

        <VapidKeyGenerator />

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Setup Instructions</h2>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-medium">1. Generate Keys</h3>
              <p className="text-muted-foreground">Click the "Generate VAPID Keys" button above to create new keys.</p>
            </div>
            <div>
              <h3 className="font-medium">2. Store Private Key in Supabase</h3>
              <p className="text-muted-foreground">
                Add the private key as a secret named <code className="bg-muted px-1 rounded">VAPID_PRIVATE_KEY</code> in your Supabase Edge Functions settings.
              </p>
            </div>
            <div>
              <h3 className="font-medium">3. Update Code</h3>
              <p className="text-muted-foreground">
                Replace the public key in <code className="bg-muted px-1 rounded">usePushNotifications.tsx</code> with your generated public key.
              </p>
            </div>
            <div>
              <h3 className="font-medium">4. Test Notifications</h3>
              <p className="text-muted-foreground">
                Once setup is complete, try enabling AI jokes to test push notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}