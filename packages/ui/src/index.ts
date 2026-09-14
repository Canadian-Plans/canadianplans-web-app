/**
 * @canadian-plans/ui — shared shadcn/ui-based primitives and design tokens.
 * Import `@canadian-plans/ui/tokens.css` once per app (root layout) for the
 * colour/radius/spacing/font variables consumed by these components.
 */
export { cn } from './lib/utils';

export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/card';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from './components/dropdown-menu';
export { Input } from './components/input';
export { Label } from './components/label';
export { Separator } from './components/separator';
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './components/sheet';
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/sidebar';
export { Skeleton } from './components/skeleton';
export { SkipLink } from './components/skip-link';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip';
export { useIsMobile } from './hooks/use-mobile';
