import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  id?: string;
}

const POPULAR_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com.br',
  'icloud.com',
  'live.com',
  'yahoo.com',
  'uol.com.br',
  'bol.com.br',
];

export const EmailAutocomplete = ({
  value,
  onChange,
  placeholder = "seu@email.com",
  className,
  error,
  id,
}: EmailAutocompleteProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getSuggestions = (): string[] => {
    if (!value || value.includes('@') && value.split('@')[1]?.includes('.')) {
      return [];
    }

    const [localPart, domainPart] = value.split('@');
    
    if (!localPart) return [];

    if (domainPart !== undefined) {
      // User typed @, filter domains
      return POPULAR_DOMAINS
        .filter(domain => domain.toLowerCase().startsWith(domainPart.toLowerCase()))
        .map(domain => `${localPart}@${domain}`)
        .slice(0, 5);
    }

    // No @, show all suggestions
    return POPULAR_DOMAINS
      .map(domain => `${localPart}@${domain}`)
      .slice(0, 5);
  };

  const suggestions = getSuggestions();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onChange(suggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onChange(suggestions[selectedIndex]);
        }
        setShowSuggestions(false);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(className, error && 'border-destructive')}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                index === selectedIndex && "bg-accent text-accent-foreground"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
