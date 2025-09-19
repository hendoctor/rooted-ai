import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TruncatedTextProps {
  text: string;
  maxLength: number;
  className?: string;
  showTooltip?: boolean;
}

export function TruncatedText({ 
  text, 
  maxLength, 
  className = "", 
  showTooltip = true 
}: TruncatedTextProps) {
  const shouldTruncate = text && text.length > maxLength;
  const displayText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text || '';
  
  if (!shouldTruncate || !showTooltip) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-3">
          <p className="whitespace-pre-wrap text-sm">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}