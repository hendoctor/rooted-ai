import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JokeFrequency } from '@/hooks/usePushNotifications';

interface FrequencySelectorProps {
  frequency: JokeFrequency;
  onFrequencyChange: (frequency: JokeFrequency) => void;
  disabled?: boolean;
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({
  frequency,
  onFrequencyChange,
  disabled = false
}) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleTypeChange = (type: JokeFrequency['type']) => {
    if (type === 'specific_days') {
      onFrequencyChange({ type, days: [1, 2, 3, 4, 5] }); // Default to weekdays
    } else {
      onFrequencyChange({ type, value: 1 });
    }
  };

  const handleValueChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      onFrequencyChange({ ...frequency, value: numValue });
    }
  };

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    const currentDays = frequency.days || [];
    let newDays;
    
    if (checked) {
      newDays = [...currentDays, dayIndex].sort();
    } else {
      newDays = currentDays.filter(day => day !== dayIndex);
    }
    
    onFrequencyChange({ ...frequency, days: newDays });
  };

  return (
    <Card className="bg-slate-800/30 border-sage/20">
      <CardHeader>
        <CardTitle className="text-sm text-sage">Joke Frequency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select 
            value={frequency.type} 
            onValueChange={handleTypeChange}
            disabled={disabled}
          >
            <SelectTrigger className="bg-slate-700/50 border-sage/30 text-cream">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-sage/30">
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="specific_days">Specific Days</SelectItem>
            </SelectContent>
          </Select>

          {frequency.type !== 'specific_days' && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="frequency-value" className="text-sage text-sm">Every</Label>
              <Input
                id="frequency-value"
                type="number"
                min="1"
                value={frequency.value || 1}
                onChange={(e) => handleValueChange(e.target.value)}
                disabled={disabled}
                className="bg-slate-700/50 border-sage/30 text-cream w-20 placeholder:text-white dark:placeholder:text-white"
              />
            </div>
          )}
        </div>

        {frequency.type === 'specific_days' && (
          <div className="space-y-3">
            <Label className="text-sage text-sm">Select Days:</Label>
            <div className="grid grid-cols-2 gap-2">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={frequency.days?.includes(index) || false}
                    onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                    disabled={disabled}
                    className="border-sage/30"
                  />
                  <Label 
                    htmlFor={`day-${index}`} 
                    className="text-sage text-sm cursor-pointer"
                  >
                    {day.slice(0, 3)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-sage/70 bg-slate-900/30 p-2 rounded">
          {frequency.type === 'specific_days' 
            ? `Jokes will be sent once per day on selected days`
            : `Jokes will be sent every ${frequency.value || 1} ${frequency.type}`
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default FrequencySelector;