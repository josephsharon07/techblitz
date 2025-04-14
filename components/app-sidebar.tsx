import * as React from "react"
import { ChevronRight, LogOut, Home } from "lucide-react"
import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { url } from "inspector";
import { set } from "zod";

// This is sample data.
const data = {
  navMain: [
    {
      title : "Payment",
      key : "payment",
      url: "#",
      items: [
        {
          title: "Confirm Payment",
          url: "/transaction/confirm",
        },
        {
          title: "List of Payments",
          url: "/transaction/list",
        }
      ]
    },
    {
      title : "Registration",
      key : "registration",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/registration/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/registration/list",
        }
      ]
    },
    {
      title : "Food",
      key : "food",
      url: "#",
      items: [
        {
          title: "Lunch Check In",
          url: "/food/checkin",
        },
        {
          title: "Lunch List",
          url: "/food/list",
        }
      ]
    },
    {
      title : "Techinical Connection",
      key : "technical_connection",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Technical Connection/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Technical Connection/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Technical Connection/list",
        }
      ]
    },
    {
      title : "Debugging",
      key : "debugging",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Debugging/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Debugging/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Debugging/list",
        }
      ]
    },
    {
      title : "Paper Presentation",
      key : "paper_presentation",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Paper Presentation/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Paper Presentation/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Paper Presentation/list",
        }
      ]
    },
    {
      title : "Project Expo",
      key : "project_expo",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Project Expo/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Project Expo/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Project Expo/list",
        }
      ]
    },
    {
      title : "Prompt Engineering",
      key : "prompt_engineering",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Prompt Engineering/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Prompt Engineering/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Prompt Engineering/list",
        }
      ]
    },
    {
      title : "Tressure Hunt",
      key : "tressure_hunt",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Treasure Hunt/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Treasure Hunt/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Treasure Hunt/list",
        }
      ]
    },
    {
      title : "Bioscope",
      key : "bioscope",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Bioscope/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Bioscope/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Bioscope/list",
        }
      ]
    },
    {
      title : "Lyrics Detective",
      key : "lyrics_detective",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Lyric Detective/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Lyric Detective/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Lyric Detective/list",
        }
      ]
    },
    {
      title : "Meme Creation",
      key : "meme_creation",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Meme Creation/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Meme Creation/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Meme Creation/list",
        }
      ]
    },
    {
      title : "Video Editing and Photography",
      key : "video_editing_photography",
      url: "#",
      items: [
        {
          title: "Check In  Using QR Code",
          url: "/event/Video Editing & Photography/checkin",
        },
        {
          title: "List of Participants Checked In",
          url: "/event/Video Editing & Photography/checkinlist",
        },
        {
          title: "List of Participants",
          url: "/event/Video Editing & Photography/list",
        }
      ]
    },
    {
      title : "Super Admin",
      key : "super_admin",
      url: "#",
      items: [
        {
          title: "Admin Management",
          url: "/admin/revoke",
        },

      ]
    }
      
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [permission, setPermissions] = useState<Record<string, boolean>>({});
    const [hasAnyPermission, setHasAnyPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchPermissions = async () => {
        setIsLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            console.error("Session is null. User is not authenticated.");
            return;
          }

          const { data } = await supabase
            .from('admin')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setPermissions(data);
          setHasAnyPermission(Object.values(data || {}).some(value => value === true));
        } finally {
          setIsLoading(false);
        }
      };
      fetchPermissions();
    }, []);

    const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    };

  return (
    <Sidebar {...props} className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="hover:bg-accent/50 transition-colors">
                <a href="/">
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <div className="flex items-center gap-3">
                      <img src="/head_logo.png" alt="TechBlitz Logo" className="w-12 h-12 rounded-lg shadow-sm" />
                      <div>
                        <span className="truncate font-bold text-lg">TechBlitz</span>
                        <span className="truncate text-muted-foreground block">2025</span>
                      </div>
                    </div>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button variant="ghost" size="icon" className="hover:bg-accent/50" asChild>
            <a href="/">
              <Home className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : !hasAnyPermission ? (
          <div className="px-3 py-2 text-muted-foreground">
            You have no access to any sections. Contact Super Admin for permissions.
          </div>
        ) : (
          data.navMain.map((item) => (
            permission[item.key] === true && (
              <Collapsible
                key={item.title}
                title={item.title}
                className="group/collapsible"
              >
                <SidebarGroup>
                  <SidebarGroupLabel
                    asChild
                    className="group/label text-sidebar-foreground hover:bg-accent/50 hover:text-accent-foreground rounded-md transition-colors px-3 py-2"
                  >
                    <CollapsibleTrigger className="flex items-center w-full">
                      {item.title}
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90 opacity-70" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent className="pl-4 pt-1">
                      <SidebarMenu>
                        {item.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-colors px-3 py-2">
                              <a href={item.url}>{item.title}</a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )
          ))
        )}
      </SidebarContent>
      <SidebarRail className="bg-border/10" />
      <SidebarFooter className="border-t border-border/40 p-4 space-y-2">
        <ThemeSwitcher />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout} 
              className="w-full flex items-center hover:bg-destructive/10 hover:text-destructive transition-colors rounded-md px-3 py-2"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
