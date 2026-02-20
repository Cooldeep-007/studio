"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const sidebarNavItems = [
  {
    title: "Custom Fields",
    href: "/settings/custom-fields",
  },
  {
    title: "Invoice Templates",
    href: "/settings/invoice-templates",
  },
  {
    title: "Subscription",
    href: "/settings/subscription",
  },
  {
    title: "Users & Roles",
    href: "/settings/users",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your firm, company settings, and user accounts.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-transparent hover:underline",
                  "justify-start"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
