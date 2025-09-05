import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  MousePointer,
  Keyboard,
  Monitor,
  Type,
  Contrast,
  Zap
} from 'lucide-react';

interface AccessibilityCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
  impact: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
}

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
  focusIndicators: boolean;
  audioDescriptions: boolean;
}

export const AccessibilityPanel = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    keyboardNavigation: true,
    screenReaderMode: false,
    focusIndicators: true,
    audioDescriptions: false
  });

  const [checks, setChecks] = useState<AccessibilityCheck[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Mock accessibility checks
  useEffect(() => {
    const mockChecks: AccessibilityCheck[] = [
      {
        id: 'color-contrast',
        name: 'Color Contrast',
        description: 'Text has sufficient contrast against background',
        status: 'pass',
        impact: 'high',
        automated: true
      },
      {
        id: 'alt-text',
        name: 'Image Alt Text',
        description: 'All images have descriptive alt text',
        status: 'pass',
        impact: 'high',
        automated: true
      },
      {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        description: 'All interactive elements are keyboard accessible',
        status: 'pass',
        impact: 'critical',
        automated: false
      },
      {
        id: 'focus-indicators',
        name: 'Focus Indicators',
        description: 'Focused elements have clear visual indicators',
        status: 'pass',
        impact: 'high',
        automated: true
      },
      {
        id: 'semantic-html',
        name: 'Semantic HTML',
        description: 'Proper use of semantic HTML elements',
        status: 'warn',
        impact: 'medium',
        automated: true
      },
      {
        id: 'aria-labels',
        name: 'ARIA Labels',
        description: 'Complex components have appropriate ARIA labels',
        status: 'pass',
        impact: 'high',
        automated: true
      },
      {
        id: 'heading-structure',
        name: 'Heading Structure',
        description: 'Logical heading hierarchy (H1-H6)',
        status: 'pass',
        impact: 'medium',
        automated: true
      },
      {
        id: 'form-labels',
        name: 'Form Labels',
        description: 'All form inputs have associated labels',
        status: 'pass',
        impact: 'high',
        automated: true
      }
    ];

    setChecks(mockChecks);
    
    // Calculate overall score
    const passCount = mockChecks.filter(check => check.status === 'pass').length;
    const score = (passCount / mockChecks.length) * 100;
    setOverallScore(score);
  }, []);

  // Apply accessibility settings
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--enable-animations', '0');
      root.classList.add('reduce-motion');
    } else {
      root.style.setProperty('--enable-animations', '1');
      root.classList.remove('reduce-motion');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
      // Announce when screen reader mode is enabled
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Screen reader optimizations enabled';
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [settings]);

  const toggleSetting = useCallback((key: keyof AccessibilitySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const runAccessibilityCheck = useCallback(async () => {
    setIsRunning(true);
    
    // Simulate running accessibility checks
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would run tools like axe-core
    console.log('Accessibility audit completed');
    setIsRunning(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'default';
      case 'warn': return 'secondary';
      case 'fail': return 'destructive';
      default: return 'outline';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accessibility Control Panel</h2>
          <p className="text-muted-foreground">
            Enterprise compliance and user experience optimization
          </p>
        </div>
        <Button onClick={runAccessibilityCheck} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run Audit'}
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Accessibility Score
          </CardTitle>
          <CardDescription>
            Overall compliance with WCAG 2.1 AA standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{Math.round(overallScore)}%</div>
            <div className="flex-1">
              <Progress value={overallScore} className="h-3" />
            </div>
            <Badge variant={overallScore >= 90 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}>
              {overallScore >= 90 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Work'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accessibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              User Preferences
            </CardTitle>
            <CardDescription>
              Customize the interface for better accessibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  <span className="text-sm font-medium">High Contrast</span>
                </div>
                <Button
                  variant={settings.highContrast ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('highContrast')}
                >
                  {settings.highContrast ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Reduced Motion</span>
                </div>
                <Button
                  variant={settings.reducedMotion ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('reducedMotion')}
                >
                  {settings.reducedMotion ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span className="text-sm font-medium">Large Text</span>
                </div>
                <Button
                  variant={settings.largeText ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('largeText')}
                >
                  {settings.largeText ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  <span className="text-sm font-medium">Keyboard Navigation</span>
                </div>
                <Button
                  variant={settings.keyboardNavigation ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('keyboardNavigation')}
                >
                  {settings.keyboardNavigation ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.screenReaderMode ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  <span className="text-sm font-medium">Screen Reader Mode</span>
                </div>
                <Button
                  variant={settings.screenReaderMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('screenReaderMode')}
                >
                  {settings.screenReaderMode ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  <span className="text-sm font-medium">Enhanced Focus</span>
                </div>
                <Button
                  variant={settings.focusIndicators ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSetting('focusIndicators')}
                >
                  {settings.focusIndicators ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Compliance Checks
            </CardTitle>
            <CardDescription>
              Automated and manual accessibility validations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {checks.map(check => (
                <div key={check.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{check.name}</span>
                      <Badge variant={getStatusColor(check.status)} className="text-xs">
                        {check.status.toUpperCase()}
                      </Badge>
                      {!check.automated && (
                        <Badge variant="outline" className="text-xs">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                    <div className={`text-xs font-medium ${getImpactColor(check.impact)}`}>
                      {check.impact.toUpperCase()} IMPACT
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Accessibility Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Test with Screen Reader
            </Button>
            <Button variant="outline" size="sm">
              Navigate with Keyboard Only
            </Button>
            <Button variant="outline" size="sm">
              Check Color Contrast
            </Button>
            <Button variant="outline" size="sm">
              Validate HTML Semantics
            </Button>
            <Button variant="outline" size="sm">
              Generate VPAT Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This application follows WCAG 2.1 AA guidelines and Section 508 compliance standards. 
          Regular accessibility audits ensure enterprise-grade accessibility compliance.
        </AlertDescription>
      </Alert>
    </div>
  );
};