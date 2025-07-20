import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, RefreshCw } from 'lucide-react';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function VapidKeyGenerator() {
  const [keys, setKeys] = useState<VapidKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateKeys = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vapid-keys');
      
      if (error) throw error;
      
      if (data.success) {
        setKeys({
          publicKey: data.publicKey,
          privateKey: data.privateKey
        });
        
        toast({
          title: "VAPID Keys Generated",
          description: "Store these keys securely! You'll need them for push notifications.",
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          VAPID Key Generator
        </CardTitle>
        <CardDescription>
          Generate VAPID keys for web push notifications. These keys are required for push notifications to work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={generateKeys} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate VAPID Keys"}
        </Button>

        {keys && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Key (VAPID_PUBLIC_KEY)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
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
              <label className="text-sm font-medium">Private Key (VAPID_PRIVATE_KEY)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
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

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Store these keys securely. The private key should be kept secret and stored as a Supabase Edge Function secret.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}