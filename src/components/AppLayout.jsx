import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Settings,
  UtensilsCrossed,
  CalendarClock,
  BarChart3,
  Users,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestaurantProvider } from "@/lib/RestaurantContext";
import RestaurantSelector from "@/components/RestaurantSelector";

const adminNav = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
  { label: "Salões", path: "/admin/rooms", icon: UtensilsCrossed },
  { label: "Ajustes de Reserva", path: "/admin/booking-settings", icon: CalendarClock },
  { label: "Relatórios", path: "/admin/reports", icon: BarChart3 },
  { label: "Usuários", path: "/admin/users", icon: Users },
  { label: "Configurações", path: "/admin/settings", icon: Settings },
];

const operatorNav = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
];

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNav.slice(0, -1) : operatorNav;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <RestaurantProvider>
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-foreground">Reservas</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-foreground text-lg">Reservas</h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {isAdmin ? "Administrador" : "Operador"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Restaurant Selector */}
          <div className="px-4 pb-4">
            <RestaurantSelector />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Configuração
                  </p>
                </div>
                <Link
                  to={adminNav[adminNav.length - 1].path}
                  onClick={() => setSidebarOpen(false)}
                  className={`mx-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    location.pathname === adminNav[adminNav.length - 1].path
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>Configurações</span>
                </Link>
              </>
            )}
          </nav>

          {/* User / Logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {user?.full_name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.full_name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
    </RestaurantProvider>
  );
}