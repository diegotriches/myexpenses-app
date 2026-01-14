// src/components/ui/responsive-card.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface ResponsiveCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean; // Modo compacto para mobile
  loading?: boolean;
}

export function ResponsiveCard({
  title,
  description,
  children,
  className,
  compact = false,
  loading = false,
}: ResponsiveCardProps) {
  const isMobile = useIsMobile();
  
  // Padding menor em mobile se compact=true
  const padding = compact && isMobile ? "p-3" : "p-4 md:p-6";

  return (
    <Card className={cn("relative", className)}>
      {(title || description) && (
        <CardHeader className={compact && isMobile ? "p-3 pb-2" : undefined}>
          {title && (
            <CardTitle className={cn(
              "text-lg md:text-xl",
              compact && isMobile && "text-base"
            )}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={cn(
              "text-xs md:text-sm",
              compact && isMobile && "text-xs"
            )}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      
      <CardContent className={padding}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Card de estatística responsivo
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
}

export function StatCard({ title, value, icon, trend, loading }: StatCardProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
            <p className={cn(
              "font-bold",
              isMobile ? "text-xl" : "text-2xl md:text-3xl"
            )}>
              {value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs flex items-center gap-1",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}>
                <span>{trend.value >= 0 ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-lg bg-primary/10 p-2",
              isMobile ? "h-10 w-10" : "h-12 w-12"
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}