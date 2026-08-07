import { FileText, GitBranch, Scroll, Building2, Users, Shield, FileCog, LogOut, UserCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

// Registry of feature pages with their icons; rendered only when the user has access.
const featureItems: NavItem[] = [
  { title: "PCT → U.S. Documents", url: "/create-documents", icon: FileText },
  { title: "USPTO Documents", url: "/uspto-documents", icon: Building2 },
  { title: "Continuity", url: "/continuity", icon: GitBranch },
];

const adminItems: NavItem[] = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Roles", url: "/admin/roles", icon: Shield },
  { title: "Pages", url: "/admin/pages", icon: FileCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { accessiblePaths, isSuperAdmin, profile, signOut } = useAuth();

  const visibleFeatures = featureItems.filter((item) => isSuperAdmin || accessiblePaths.has(item.url));

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const renderItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={currentPath === item.url}>
          <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Scroll className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-[15px] font-semibold text-sidebar-foreground">Patmimo</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Doc Filing</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visibleFeatures.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(visibleFeatures)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {!collapsed && profile && (
            <div className="px-2 py-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{profile.full_name || profile.email}</p>
              <p className="truncate text-[10px] text-muted-foreground">{profile.email}</p>
            </div>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === "/account"}>
              <NavLink to="/account" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                <UserCog className="mr-2 h-4 w-4" />
                {!collapsed && <span>Account</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="hover:bg-muted/50">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
