
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building,
  BookCopy,
  Receipt,
  BarChart3,
  Settings,
  Landmark,
  Wallet,
  Notebook,
  Percent,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { doc, serverTimestamp } from 'firebase/firestore';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { signOut } from '@/lib/auth-actions';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { WelcomeModal } from '@/components/welcome-modal';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Owner', 'Admin', 'Accountant', 'Staff'] },
  { href: '/companies', label: 'Companies', icon: Building, roles: ['Owner', 'Admin'] },
  { href: '/ledgers', label: 'Masters', icon: BookCopy, roles: ['Owner', 'Admin', 'Accountant'] },
  { href: '/vouchers', label: 'Vouchers', icon: Receipt, roles: ['Owner', 'Admin', 'Accountant', 'Staff'] },
  { href: '/bank', label: 'Bank', icon: Landmark, roles: ['Owner', 'Admin', 'Accountant'] },
  { href: '/cash', label: 'Cash', icon: Wallet, roles: ['Owner', 'Admin', 'Accountant'] },
  { href: '/notepad', label: 'Notepad', icon: Notebook, roles: ['Owner', 'Admin', 'Accountant', 'Staff'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['Owner', 'Admin', 'Accountant'] },
];

const settingsMenuItem = {
  href: '/settings/custom-fields',
  label: 'Settings',
  icon: Settings,
  roles: ['Owner', 'Admin'],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useUser();
  const { firestore } = useFirebase();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = React.useState(false);

  const userRole = profile?.role;

  React.useEffect(() => {
    if (profile?.firstLogin) {
      setIsWelcomeModalOpen(true);
    }
  }, [profile]);

  const handleWelcomeModalClose = () => {
    setIsWelcomeModalOpen(false);
    if (profile && firestore) {
      const userRef = doc(firestore, 'users', profile.uid);
      updateDocumentNonBlocking(userRef, {
        firstLogin: false,
        welcomeTimestamp: serverTimestamp(),
      });
    }
  };


  const isActive = (path: string) => {
    if (path === '/settings/custom-fields') {
      return pathname.startsWith('/settings');
    }
    // For ledgers, which is under /ledgers, but label is Masters
    if (path === '/ledgers') {
      return pathname.startsWith('/ledgers');
    }
    return pathname === path;
  };
  const isGstActive = pathname.startsWith('/gst');

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 group/logo"
            >
              <svg
                className="h-8 w-8 text-primary group-hover/logo:scale-105 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 7L12 12L22 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 22V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">
                Pro Accounting
              </span>
            </Link>
            <SidebarTrigger className="hidden md:flex" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              userRole && item.roles.includes(userRole) && (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={{ children: item.label }}
                    className="justify-start"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
            {(userRole === 'Owner' || userRole === 'Admin' || userRole === 'Accountant') && (
              <SidebarMenuItem>
                <Collapsible>
                  <CollapsibleTrigger className="w-full" asChild>
                    <SidebarMenuButton isActive={isGstActive} tooltip={{ children: 'GST' }}>
                      <Percent />
                      <span className="group-data-[collapsible=icon]:hidden w-full text-left">
                        GST
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-90 group-data-[collapsible=icon]:hidden ml-auto" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === '/gst/gstr-1'}
                        >
                          <Link href="/gst/gstr-1">GSTR-1</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === '/gst/gstr-2b'}
                        >
                          <Link href="/gst/gstr-2b">GSTR-2B</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === '/gst/gstr-3b'}
                        >
                          <Link href="/gst/gstr-3b">GSTR-3B</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <SidebarMenu>
            {userRole && settingsMenuItem.roles.includes(userRole) && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(settingsMenuItem.href)}
                  tooltip={{ children: settingsMenuItem.label }}
                  className="justify-start"
                >
                  <Link href={settingsMenuItem.href}>
                    <settingsMenuItem.icon />
                    <span>{settingsMenuItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
          <SidebarTrigger className="sm:hidden" />
          <div className="relative ml-auto flex-1 md:grow-0"></div>
          {profile && <UserMenu user={profile} avatarUrl={user?.photoURL || userAvatar?.imageUrl} />}
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:pb-6">{children}</main>
      </SidebarInset>
      <WelcomeModal
        open={isWelcomeModalOpen}
        onOpenChange={handleWelcomeModalClose}
        userName={profile?.name}
      />
    </SidebarProvider>
  );
}

function UserMenu({ user, avatarUrl }: { user: UserProfile; avatarUrl?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-full"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                alt={user.name}
                data-ai-hint="person avatar"
              />
            )}
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings/custom-fields')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
