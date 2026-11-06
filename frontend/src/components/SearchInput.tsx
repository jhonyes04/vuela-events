import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchInput = ({
    value,
    onChange,
    placeholder,
    className,
}: SearchInputProps) => (
    <div className={cn('relative bg-card w-full sm:w-100', className)}>
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-8"
        />
    </div>
);
