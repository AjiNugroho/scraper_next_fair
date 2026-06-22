"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe2, LayoutDashboard, Users, KeyRound, ScrollText, Webhook, Smartphone, FileUp } from "lucide-react"
import { FaHashtag, FaInstagram, FaSpider } from "react-icons/fa"
import { FaTiktok } from "react-icons/fa6"
import { authClient } from "@/lib/auth-client"
import { NavUser } from "@/components/nav-main"
import { BiSolidVideos } from "react-icons/bi";
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

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Instagram",
    items: [
      { title: "Tagged Requests", url: "/instagram-tagged", icon: FaInstagram },
    ],
  },
  {
    label: "TikTok",
    items: [
      { title: "Scrape Requests", url: "/tiktok/jobs", icon: FaTiktok },
      { title: "Mobile Workers", url: "/tiktok", icon: Smartphone },
      { title: "Hashtags", url: "/tiktok/hashtags", icon: FaHashtag },
      { title: "Scraped Results", url: "/tiktok/results", icon: BiSolidVideos },
      { title: "BrightData Jobs", url: "/tiktok/scrape-jobs", icon: FaSpider },
      { title: "Bulk Video Scrape", url: "/tiktok/bulk-scrape", icon: FileUp },
    ],
  },
  {
    label: "Logs",
    items: [
      { title: "Request Log", url: "/request-log", icon: ScrollText },
      { title: "Webhook Log", url: "/webhook-log", icon: Webhook },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "User Management", url: "/admin", icon: Users },
      { title: "API Keys", url: "/api-keys", icon: KeyRound },
    ],
  },
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
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
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
        ))}
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
