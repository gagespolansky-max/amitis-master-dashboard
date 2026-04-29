import * as React from "react"
import { cn } from "@/lib/utils"

type CardSize = "default" | "sm"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: CardSize
}

const SIZE: Record<CardSize, string> = {
  default: "py-5",
  sm: "py-3",
}

export function Card({ size = "default", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-card-border bg-card-bg text-foreground",
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 px-5",
        className,
      )}
      {...rest}
    />
  )
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...rest}
    />
  )
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-[12px] text-muted-foreground", className)} {...rest} />
  )
}

export function CardAction({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute right-3 top-3 flex items-center gap-1",
        className,
      )}
      {...rest}
    />
  )
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5", className)} {...rest} />
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2 px-5", className)} {...rest} />
  )
}
