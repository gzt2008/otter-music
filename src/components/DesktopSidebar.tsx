"use client";

import { Search, Heart, User, Settings, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type DesktopTabId = "search" | "favorites" | "mine";

interface DesktopTabItem {
  id: DesktopTabId;
  label: string;
  icon: typeof Search;
  path: string;
}

const tabs: DesktopTabItem[] = [
  { id: "search", label: "发现", icon: Search, path: "/search" },
  { id: "favorites", label: "喜欢", icon: Heart, path: "/favorites" },
  { id: "mine", label: "我的", icon: User, path: "/mine" },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

export function DesktopSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const getActiveTab = (pathname: string): DesktopTabId => {
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/favorites")) return "favorites";
    if (pathname.startsWith("/mine")) return "mine";
    if (pathname.startsWith("/settings")) return "mine";
    return "search";
  };

  const activeTab = getActiveTab(location.pathname);

  return (
    <nav
      className="hidden md:flex flex-col h-full bg-card/80 border-r border-border/50 shrink-0 transition-all duration-300 select-none"
      style={{ width }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-border/30">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
          <Music className="h-4.5 w-4.5 text-primary" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold truncate">Otter Music</span>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-3 px-2 space-y-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const link = (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", isActive && "text-primary")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {tab.label}
                </span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={tab.id} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{tab.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </div>

      {/* Bottom Actions */}
      <div className="py-3 px-2 space-y-1 border-t border-border/30">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                collapsed && "justify-center px-0",
                activeTab === "mine" &&
                  location.pathname.startsWith("/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">设置</span>}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">设置</TooltipContent>}
        </Tooltip>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors w-full",
            collapsed && "justify-center px-0",
            "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <svg
            className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">收起</span>}
        </button>
      </div>
    </nav>
  );
}
