// Session status configuration with colors and icons
export const SESSION_STATUSES = [
  'Canceled',
  'Completed', 
  'Confirmed',
  'Draft',
  'Live Now',
  'Missed / No-Show',
  'Not Scheduled',
  'Ongoing',
  'Pending Confirmation',
  'Recording Available',
  'Rescheduled',
  'Scheduled',
  'To Be Scheduled',
  'Upcoming'
] as const;

export type SessionStatus = typeof SESSION_STATUSES[number];

export const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Canceled':
      return {
        color: 'hsl(var(--destructive))',
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        borderColor: 'border-destructive/20'
      };
    case 'Completed':
      return {
        color: 'hsl(142 76% 36%)', // green-600
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    case 'Confirmed':
      return {
        color: 'hsl(var(--primary))',
        bgColor: 'bg-primary/10', 
        textColor: 'text-primary',
        borderColor: 'border-primary/20'
      };
    case 'Draft':
      return {
        color: 'hsl(var(--muted-foreground))',
        bgColor: 'bg-muted/50',
        textColor: 'text-muted-foreground',
        borderColor: 'border-muted'
      };
    case 'Live Now':
      return {
        color: 'hsl(0 84% 60%)', // red-500
        bgColor: 'bg-red-50',
        textColor: 'text-red-600',
        borderColor: 'border-red-200',
        animate: 'animate-pulse'
      };
    case 'Missed / No-Show':
      return {
        color: 'hsl(38 92% 50%)', // amber-500
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
      };
    case 'Not Scheduled':
      return {
        color: 'hsl(var(--muted-foreground))',
        bgColor: 'bg-muted/30',
        textColor: 'text-muted-foreground',
        borderColor: 'border-muted'
      };
    case 'Ongoing':
      return {
        color: 'hsl(142 76% 36%)', // green-600
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        animate: 'animate-pulse'
      };
    case 'Pending Confirmation':
      return {
        color: 'hsl(45 93% 47%)', // yellow-500
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      };
    case 'Recording Available':
      return {
        color: 'hsl(262 83% 58%)', // purple-500
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      };
    case 'Rescheduled':
      return {
        color: 'hsl(38 92% 50%)', // amber-500
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
      };
    case 'Scheduled':
      return {
        color: 'hsl(var(--primary))',
        bgColor: 'bg-primary/10',
        textColor: 'text-primary',
        borderColor: 'border-primary/20'
      };
    case 'To Be Scheduled':
      return {
        color: 'hsl(var(--muted-foreground))',
        bgColor: 'bg-muted/50',
        textColor: 'text-muted-foreground',
        borderColor: 'border-muted'
      };
    case 'Upcoming':
      return {
        color: 'hsl(217 91% 60%)', // blue-500
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      };
    default:
      return {
        color: 'hsl(var(--muted-foreground))',
        bgColor: 'bg-muted/50',
        textColor: 'text-muted-foreground',
        borderColor: 'border-muted'
      };
  }
};