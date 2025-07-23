import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Key, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function VapidSetup() {
  const [keys, setKeys] = useState<VapidKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSetupKeys = async () => {
    setIsLoading(true);
    try {
      // Generate new VAPID keys
      const { data, error } = await supabase.functions.invoke('generate-vapid-keys');
      
      if (error) throw error;
      
      if (data.success) {
        setKeys({
          publicKey: data.publicKey,
          privateKey: data.privateKey
        });
        
        toast({
          title: "VAPID Keys Generated",
          description: "Please copy these keys and update your code manually.",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error generating VAPID keys:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate VAPID keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, keyType: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${keyType} copied to clipboard.`,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          VAPID Keys Setup for Push Notifications
        </CardTitle>
        <CardDescription>
          Generate VAPID keys and follow the manual setup instructions below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Manual Setup Required:</strong> After generating keys, you'll need to manually update the code files listed below.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={generateAndSetupKeys} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Generating Keys..." : "Generate New VAPID Keys"}
        </Button>

        {keys && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Public Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-xs break-all font-mono">
                    {keys.publicKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(keys.publicKey, 'Public key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Private Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-xs break-all font-mono">
                    {keys.privateKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(keys.privateKey, 'Private key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Manual Setup Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li>
                  <strong>Store Private Key:</strong> Add the private key to Supabase Edge Function secrets as <code>VAPID_PRIVATE_KEY</code>
                  <br />
                  <a 
                    href="https://supabase.com/dashboard/project/ylewpehqfgltbhpkaout/settings/functions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    → Open Supabase Edge Function Secrets
                  </a>
                </li>
                <li>
                  <strong>Update Hook:</strong> Replace <code>VAPID_PUBLIC_KEY</code> in <code>src/hooks/usePushNotifications.tsx</code> line 26
                </li>
                <li>
                  <strong>Update Edge Function:</strong> Replace <code>VAPID_PUBLIC_KEY</code> in <code>supabase/functions/send-push-notifications/index.ts</code> line 24
                </li>
                <li>
                  <strong>Redeploy:</strong> The edge functions will redeploy automatically when you save the changes
                </li>
              </ol>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Security Note:</strong> The private key should only be stored in Supabase Edge Function secrets. 
                Never commit it to your code repository.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}