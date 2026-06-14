"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe2, LayoutDashboard, Users } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { NavUser } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "User Management", url: "/admin", icon: Users },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Globe2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Scraper</span>
                  <span className="text-xs text-muted-foreground">fair-studio</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {session?.user && (
          <NavUser
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
          />
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
