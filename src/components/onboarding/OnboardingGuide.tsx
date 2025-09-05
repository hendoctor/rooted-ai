import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Play, ArrowRight, CheckCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  element?: string; // CSS selector for highlighting
  action?: string;
  completed: boolean;
}

interface OnboardingFlow {
  id: string;
  title: string;
  description: string;
  steps: OnboardingStep[];
  targetRole?: string;
}

export const OnboardingGuide = () => {
  const { userRole } = useAuth();
  const [activeFlow, setActiveFlow] = useState<OnboardingFlow | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedFlows, setCompletedFlows] = useState<Set<string>>(new Set());

  // Define onboarding flows
  const onboardingFlows: OnboardingFlow[] = [
    {
      id: 'admin-setup',
      title: 'Admin Dashboard Setup',
      description: 'Learn how to manage users and configure your platform',
      targetRole: 'Admin',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Admin Dashboard',
          description: 'Get familiar with your administrative controls and features.',
          completed: false
        },
        {
          id: 'invite-users',
          title: 'Invite Users',
          description: 'Learn how to invite clients and team members to your platform.',
          element: '[data-onboarding="invite-button"]',
          action: 'Click the "Invite User" button',
          completed: false
        },
        {
          id: 'manage-content',
          title: 'Manage Content',
          description: 'Discover how to create and assign content to different companies.',
          element: '[data-onboarding="content-section"]',
          completed: false
        },
        {
          id: 'monitor-activity',
          title: 'Monitor System Activity',
          description: 'View security logs and performance metrics.',
          element: '[data-onboarding="monitoring-panel"]',
          completed: false
        }
      ]
    },
    {
      id: 'client-portal',
      title: 'Client Portal Tour',
      description: 'Explore your personalized client dashboard',
      targetRole: 'Client',
      steps: [
        {
          id: 'dashboard-overview',
          title: 'Your Dashboard',
          description: 'This is your personalized dashboard with all your important information.',
          completed: false
        },
        {
          id: 'view-reports',
          title: 'View Reports',
          description: 'Access your performance reports and analytics.',
          element: '[data-onboarding="reports-section"]',
          completed: false
        },
        {
          id: 'ai-tools',
          title: 'AI Tools',
          description: 'Discover AI tools assigned to help with your projects.',
          element: '[data-onboarding="ai-tools"]',
          completed: false
        },
        {
          id: 'support-resources',
          title: 'Support Resources',
          description: 'Find helpful resources and documentation.',
          element: '[data-onboarding="resources"]',
          completed: false
        }
      ]
    }
  ];

  // Load completed flows from localStorage
  useEffect(() => {
    const completed = localStorage.getItem('completed_onboarding_flows');
    if (completed) {
      setCompletedFlows(new Set(JSON.parse(completed)));
    }
  }, []);

  // Save completed flows to localStorage
  const saveCompletedFlows = useCallback((flows: Set<string>) => {
    localStorage.setItem('completed_onboarding_flows', JSON.stringify([...flows]));
    setCompletedFlows(flows);
  }, []);

  // Check if user should see onboarding
  useEffect(() => {
    if (!userRole) return;

    const relevantFlow = onboardingFlows.find(flow => 
      !flow.targetRole || flow.targetRole === userRole
    );

    if (relevantFlow && !completedFlows.has(relevantFlow.id)) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setActiveFlow(relevantFlow);
        setIsVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [userRole, completedFlows]);

  // Highlight current element
  useEffect(() => {
    if (!activeFlow || !isVisible) return;

    const currentStepData = activeFlow.steps[currentStep];
    if (currentStepData?.element) {
      const element = document.querySelector(currentStepData.element);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        
        return () => {
          element.classList.remove('onboarding-highlight');
        };
      }
    }
  }, [activeFlow, currentStep, isVisible]);

  const nextStep = useCallback(() => {
    if (!activeFlow) return;

    // Mark current step as completed
    const updatedFlow = {
      ...activeFlow,
      steps: activeFlow.steps.map((step, index) =>
        index === currentStep ? { ...step, completed: true } : step
      )
    };
    setActiveFlow(updatedFlow);

    if (currentStep < activeFlow.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Flow completed
      const newCompletedFlows = new Set(completedFlows);
      newCompletedFlows.add(activeFlow.id);
      saveCompletedFlows(newCompletedFlows);
      closeOnboarding();
    }
  }, [activeFlow, currentStep, completedFlows, saveCompletedFlows]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    if (!activeFlow) return;
    
    const newCompletedFlows = new Set(completedFlows);
    newCompletedFlows.add(activeFlow.id);
    saveCompletedFlows(newCompletedFlows);
    closeOnboarding();
  }, [activeFlow, completedFlows, saveCompletedFlows]);

  const closeOnboarding = useCallback(() => {
    setIsVisible(false);
    setActiveFlow(null);
    setCurrentStep(0);
  }, []);

  const restartOnboarding = useCallback((flowId: string) => {
    const flow = onboardingFlows.find(f => f.id === flowId);
    if (flow) {
      setActiveFlow(flow);
      setCurrentStep(0);
      setIsVisible(true);
    }
  }, []);

  if (!isVisible || !activeFlow) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const relevantFlow = onboardingFlows.find(flow => 
              !flow.targetRole || flow.targetRole === userRole
            );
            if (relevantFlow) {
              restartOnboarding(relevantFlow.id);
            }
          }}
          className="bg-background/95 backdrop-blur-sm border shadow-lg"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </div>
    );
  }

  const currentStepData = activeFlow.steps[currentStep];
  const progress = ((currentStep + 1) / activeFlow.steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
      
      {/* Onboarding Card */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <Card className="shadow-2xl border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{activeFlow.title}</CardTitle>
                <CardDescription>{activeFlow.description}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeOnboarding}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep + 1} of {activeFlow.steps.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Current Step */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {currentStep + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-base">{currentStepData.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentStepData.description}
                  </p>
                  {currentStepData.action && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      <Play className="h-3 w-3 mr-1" />
                      {currentStepData.action}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Steps Overview */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">All Steps</h4>
              <div className="space-y-1">
                {activeFlow.steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 text-xs p-1 rounded ${
                      index === currentStep 
                        ? 'bg-primary/10 text-primary' 
                        : step.completed 
                        ? 'text-green-600' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <div className={`w-3 h-3 rounded-full border ${
                        index === currentStep ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`} />
                    )}
                    <span className="truncate">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={skipOnboarding}>
                  Skip Tour
                </Button>
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={previousStep}>
                    Previous
                  </Button>
                )}
              </div>
              
              <Button size="sm" onClick={nextStep}>
                {currentStep === activeFlow.steps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};