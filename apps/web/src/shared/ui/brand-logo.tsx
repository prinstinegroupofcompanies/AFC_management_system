import { cn } from '@/shared/lib/utils';

interface BrandLogoProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  collapsed?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 max-w-[8rem]',
  md: 'h-10 max-w-[10rem]',
  lg: 'h-14 max-w-[14rem]',
  xl: 'h-20 max-w-[18rem]',
};

export function BrandLogo({
  src,
  alt,
  size = 'md',
  collapsed = false,
  className,
}: BrandLogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'shrink-0 rounded-lg bg-white object-contain',
        collapsed ? 'h-9 w-9 object-center p-0.5' : sizeClasses[size],
        className
      )}
    />
  );
}
