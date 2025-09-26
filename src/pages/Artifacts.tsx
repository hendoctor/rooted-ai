import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Sparkles, Target, Zap, Brain, Eye, Users, Code, Palette, Shield, Lightbulb } from 'lucide-react';
import { AnimatedSection } from '@/hooks/useScrollAnimation';

interface AIUseCase {
  title: string;
  description: string;
}

interface AILevel {
  level: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  useCases: AIUseCase[];
}

const aiLevels: AILevel[] = [
  {
    level: 1,
    title: "Basic Productivity Boosters",
    description: "Lightweight, low-risk use cases to get executives nodding.",
    icon: <Zap className="h-6 w-6" />,
    color: "from-green-400 to-green-500",
    useCases: [
      { title: "Text rewriter & enhancer", description: "Turn rough notes into polished copy in different tones." },
      { title: "Email summarizer & draft responder", description: "Condense threads, propose replies." },
      { title: "Meeting recap generator", description: "Auto-summarizes Zoom/Teams calls with action items." },
      { title: "Policy/handbook assistant", description: "Answers employee questions from internal docs." },
      { title: "Template automation", description: "Auto-populate invoices, contracts, letters, or memos." },
      { title: "Task note converter", description: "Convert bullet notes into clear to-dos with owners/dates." }
    ]
  },
  {
    level: 2,
    title: "Knowledge & Content Copilots",
    description: "Assistants that help manage and create content across teams.",
    icon: <Brain className="h-6 w-6" />,
    color: "from-blue-400 to-blue-500",
    useCases: [
      { title: "Document Q&A assistant", description: "Search internal docs with citations." },
      { title: "Presentation builder", description: "Outline → draft slides with key visuals." },
      { title: "FAQ/chatbot", description: "Answers common client or employee questions." },
      { title: "SEO/content studio", description: "Generate blog posts, ad copy, or social snippets." },
      { title: "Multi-format converter", description: "Turn one source (webinar, report) into multiple assets." },
      { title: "Research digester", description: "Scan reports/articles → produce executive summaries." }
    ]
  },
  {
    level: 3,
    title: "Process Helpers & Light Agents",
    description: "Early \"agent\" style workflows.",
    icon: <Target className="h-6 w-6" />,
    color: "from-purple-400 to-purple-500",
    useCases: [
      { title: "Contract reviewer", description: "Highlights risks, missing clauses." },
      { title: "Customer inquiry assistant", description: "Reads tickets, suggests replies, categorizes issues." },
      { title: "Document parser", description: "Extract structured data from PDFs/forms." },
      { title: "Approval concierge", description: "Drafts approval summaries for managers." },
      { title: "Task escalation detector", description: "Flags emails with deadlines or risks." },
      { title: "Onboarding helper", description: "Turns HR docs into a personalized onboarding guide." }
    ]
  },
  {
    level: 4,
    title: "Data-Driven Assistants",
    description: "Where AI meets analysis.",
    icon: <Sparkles className="h-6 w-6" />,
    color: "from-teal-400 to-teal-500",
    useCases: [
      { title: "BI dashboard explainer", description: "Translates charts into plain English narratives." },
      { title: "KPI monitor", description: "Auto-alerts when metrics drift, with root-cause hints." },
      { title: "Trend forecaster", description: "Explains predictive results in non-technical language." },
      { title: "Duplicate record cleaner", description: "Suggests merges in CRM/ERP databases." },
      { title: "Data quality scanner", description: "Detects anomalies, nulls, or inconsistencies." },
      { title: "Survey analyzer", description: "Converts raw feedback into themes + sentiment." }
    ]
  },
  {
    level: 5,
    title: "Multimodal Capabilities",
    description: "Text + voice + vision all working together.",
    icon: <Eye className="h-6 w-6" />,
    color: "from-indigo-400 to-indigo-500",
    useCases: [
      { title: "Voice meeting copilot", description: "Diarization, summaries, and task extraction." },
      { title: "Screenshot explainer", description: "Upload a UI or report → get step-by-step analysis." },
      { title: "OCR & validation", description: "Extract data from images of receipts, IDs, labels." },
      { title: "Image quality/brand reviewer", description: "Suggests improvements to visuals and layouts." },
      { title: "Video note-taker", description: "Transcribes and produces summaries + clip highlights." },
      { title: "Speech-to-instruction", description: "Dictation → polished SOP or checklist." }
    ]
  },
  {
    level: 6,
    title: "Cross-Functional Copilots",
    description: "Generic assistants for every business function.",
    icon: <Users className="h-6 w-6" />,
    color: "from-rose-400 to-rose-500",
    useCases: [
      { title: "Sales", description: "Account briefs, call prep, objection handling." },
      { title: "Finance", description: "Budget explanations, variance analysis." },
      { title: "HR", description: "Job descriptions, candidate screeners, performance review drafts." },
      { title: "IT", description: "Runbook lookup, troubleshooting suggestions." },
      { title: "Legal", description: "Clause lookups, fallback language suggestions." },
      { title: "Marketing", description: "Campaign ideas, messaging variations." }
    ]
  },
  {
    level: 7,
    title: "Workflow Orchestration",
    description: "Chaining multiple steps, still general across industries.",
    icon: <Zap className="h-6 w-6" />,
    color: "from-amber-400 to-amber-500",
    useCases: [
      { title: "Multi-step escalation", description: "Detect issue → summarize → draft email → log." },
      { title: "Document lifecycle agent", description: "Draft → review → redline → archive." },
      { title: "Customer onboarding agent", description: "Guides through documents, collects data." },
      { title: "Collections/nudge agent", description: "Drafts reminders and tracks responses." },
      { title: "Internal service desk agent", description: "Resolves common IT/HR requests." },
      { title: "Recruiting funnel agent", description: "Screen resumes, draft outreach, schedule calls." }
    ]
  },
  {
    level: 8,
    title: "Code, Ops, and Engineering Copilots",
    description: "Applicable to IT and operations across industries.",
    icon: <Code className="h-6 w-6" />,
    color: "from-cyan-400 to-cyan-500",
    useCases: [
      { title: "Code explainer", description: "Repo → architecture map, modernization notes." },
      { title: "Test writer", description: "Generates test cases from requirements." },
      { title: "API blueprint generator", description: "Convert user stories into OpenAPI specs." },
      { title: "SQL co-pilot", description: "Write, optimize, and explain queries." },
      { title: "Infra doc builder", description: "Turn configs into diagrams + human-readable guides." },
      { title: "Automation script suggester", description: "Suggest PowerShell, Bash, or Python tasks." }
    ]
  },
  {
    level: 9,
    title: "Creative & Media Support",
    description: "Universal brand & marketing helpers.",
    icon: <Palette className="h-6 w-6" />,
    color: "from-pink-400 to-pink-500",
    useCases: [
      { title: "Brand voice guide", description: "Extracts style rules from existing materials." },
      { title: "Content consistency checker", description: "Ensures tone, grammar, and messaging align." },
      { title: "Photo enhancer + captions", description: "Generates SEO-friendly alt text." },
      { title: "Video storyboarder", description: "Turns scripts into suggested scenes." },
      { title: "Podcast/blog generator", description: "Show notes, summaries, quotes, social posts." },
      { title: "Image prompt creator", description: "Reverse-engineers design prompts for reuse." }
    ]
  },
  {
    level: 10,
    title: "Compliance & Governance",
    description: "Essential for regulated or security-minded organizations.",
    icon: <Shield className="h-6 w-6" />,
    color: "from-red-400 to-red-500",
    useCases: [
      { title: "Sensitive data redactor", description: "Auto-detects PII/PHI and masks it." },
      { title: "Policy adherence checker", description: "Validates text against company rules." },
      { title: "Citation-enforcing responder", description: "Only returns answers with sources." },
      { title: "Model registry reporter", description: "Logs models, datasets, owners, versions." },
      { title: "Use-case risk scorer", description: "Business impact vs. risk rating with recommendations." },
      { title: "Audit log generator", description: "Human-readable records of AI actions." }
    ]
  },
  {
    level: 11,
    title: "Advanced & Strategic AI",
    description: "High-impact, forward-looking demonstrations.",
    icon: <Lightbulb className="h-6 w-6" />,
    color: "from-yellow-400 to-yellow-500",
    useCases: [
      { title: "Opportunity miner", description: "Analyzes workflows to suggest automation ROI." },
      { title: "Value tracker", description: "Links AI use cases to time and cost savings." },
      { title: "Playbook generator", description: "Turns a working AI app into repeatable deployment guides." },
      { title: "Change-management assistant", description: "Produces training plans and communication scripts." },
      { title: "AI readiness assessor", description: "Surveys tools, data, and processes to gauge maturity." },
      { title: "Decision simulation", description: "Scenario exploration with structured outcomes." }
    ]
  }
];

const Artifacts = () => {
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set([1]));

  const toggleLevel = (level: number) => {
    const newOpenLevels = new Set(openLevels);
    if (newOpenLevels.has(level)) {
      newOpenLevels.delete(level);
    } else {
      newOpenLevels.add(level);
    }
    setOpenLevels(newOpenLevels);
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 3) return "Beginner";
    if (level <= 6) return "Intermediate";
    if (level <= 9) return "Advanced";
    return "Expert";
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 3) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (level <= 6) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (level <= 9) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };

  return (
    <div className="min-h-screen innovation-bg">
      <Header />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <AnimatedSection className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-forest-green dark:text-white mb-6">
              AI <span className="text-earth-brown">Artifacts</span>
            </h1>
            <p className="text-xl text-slate-gray dark:text-gray-300 mb-8 leading-relaxed">
              Discover the complete spectrum of AI use cases, from basic productivity boosters to advanced strategic implementations. 
              Explore 11 levels of AI maturity and find the perfect starting point for your organization's AI journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-gray dark:text-gray-400">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-forest-green" />
                66+ Use Cases
              </span>
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-forest-green" />
                11 Maturity Levels
              </span>
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-forest-green" />
                Rudimentary to Advanced
              </span>
            </div>
          </div>
        </AnimatedSection>

        {/* AI Levels Grid */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {aiLevels.map((level, index) => (
              <AnimatedSection 
                key={level.level} 
                animation="animate-slide-up"
                delay={index * 100}
                className="w-full"
              >
                <Card className="card-energy border-sage/20 dark:border-sage/30">
                  <Collapsible
                    open={openLevels.has(level.level)}
                    onOpenChange={() => toggleLevel(level.level)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-sage/10 dark:hover:bg-sage/5 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full bg-gradient-to-r ${level.color} text-white shadow-lg`}>
                              {level.icon}
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-xl text-forest-green dark:text-white">
                                  Level {level.level} — {level.title}
                                </CardTitle>
                                <Badge className={getDifficultyColor(level.level)}>
                                  {getDifficultyLabel(level.level)}
                                </Badge>
                              </div>
                              <CardDescription className="text-slate-gray dark:text-gray-300">
                                {level.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-slate-gray dark:text-gray-400">
                            <span className="text-sm font-medium">{level.useCases.length} use cases</span>
                            {openLevels.has(level.level) ? 
                              <ChevronDown className="h-5 w-5" /> : 
                              <ChevronRight className="h-5 w-5" />
                            }
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {level.useCases.map((useCase, useCaseIndex) => (
                            <div
                              key={useCaseIndex}
                              className="p-4 rounded-lg border border-sage/20 dark:border-sage/30 bg-white/50 dark:bg-gray-800/50 hover:bg-sage/10 dark:hover:bg-sage/5 transition-all duration-200 interactive-lift"
                            >
                              <h4 className="font-semibold text-forest-green dark:text-white mb-2">
                                {useCase.title}
                              </h4>
                              <p className="text-sm text-slate-gray dark:text-gray-300">
                                {useCase.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <AnimatedSection className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-forest-green dark:text-white mb-6">
              Ready to Build Your AI Strategy?
            </h2>
            <p className="text-lg text-slate-gray dark:text-gray-300 mb-8">
              Partner with RootedAI to identify the right AI use cases for your organization and create a roadmap 
              that delivers measurable value from day one.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://rootedai.tech/#contact"
                className="inline-flex items-center px-8 py-4 bg-forest-green text-white rounded-lg font-semibold button-energy hover:bg-forest-green/90 transition-all duration-200"
              >
                Start your AI Journey
              </a>
              <a
                href="/client-demo"
                className="inline-flex items-center px-8 py-4 border-2 border-forest-green text-forest-green dark:text-white rounded-lg font-semibold hover:bg-forest-green hover:text-white transition-all duration-200"
              >
                Explore Client Hub
              </a>
            </div>
          </div>
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
};

export default Artifacts;