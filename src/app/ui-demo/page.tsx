"use client";

import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Checkbox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui";
import { 
  Mail, 
  Lock, 
  Search, 
  Github, 
  Globe, 
  Star, 
  ArrowRight, 
  User, 
  Settings, 
  LogOut, 
  PlusCircle, 
  MessageSquare, 
  MoreVertical 
} from "lucide-react";

export default function UIDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 lg:p-16 space-y-16 max-w-7xl mx-auto">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary">SkillSphere UI Kit</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Refined with high-contrast dark tokens, interactive glow effects, and precision borders for a premium marketplace feel.
        </p>
      </header>

      <Separator />

      {/* Buttons Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Buttons</h2>
          <Badge variant="outline">Interactive</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Variants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button>Primary</Button>
              <Button variant="glow">Glow</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="white">White</Button>
              <Button variant="ghost">Ghost</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sizes & States</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dropdown Integration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glow">Open Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Invite Users</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        <span>Email</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Message</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Archive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Inputs Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Forms & Inputs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Standard Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Default input" />
              <Input leftIcon={<Mail className="size-4" />} placeholder="Email address" />
              <Input 
                leftIcon={<Lock className="size-4" />} 
                type="password" 
                placeholder="Password" 
                rightIcon={<ArrowRight className="size-4 cursor-pointer text-primary hover:scale-110 transition-transform" />}
              />
              <Input leftIcon={<Search className="size-4" />} placeholder="Search skills..." />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3">
                <Checkbox id="square-unchecked" shape="square" />
                <label htmlFor="square-unchecked" className="text-sm font-medium leading-none cursor-pointer">
                   Square Checkbox (Unchecked)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="square-checked" shape="square" checked />
                <label htmlFor="square-checked" className="text-sm font-medium leading-none cursor-pointer">
                   Square Checkbox (Checked)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="circular-unchecked" shape="circle" />
                <label htmlFor="circular-unchecked" className="text-sm font-medium leading-none cursor-pointer">
                  Circular Checkbox (Unchecked)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="circular-checked" shape="circle" checked />
                <label htmlFor="circular-checked" className="text-sm font-medium leading-none cursor-pointer">
                  Circular Checkbox (Checked)
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Badges & Cards Section */}
      <section className="space-y-8 relative">
        {/* Decorative background element to showcase glass blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Data Display</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="default" className="row-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Avatar className="size-16 ring-2 ring-primary/20">
                  <AvatarImage src="https://github.com/relativetime.png" />
                  <AvatarFallback>RT</AvatarFallback>
                </Avatar>
                <Badge variant="success">Online</Badge>
              </div>
              <CardTitle className="mt-4">Alex Rivers</CardTitle>
              <CardDescription>Senior Web3 Developer</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Helping teams build secure, scalable dApps on SkillSphere. Expert in Rust and React.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Badge variant="secondary">Rust</Badge>
                <Badge variant="secondary">React</Badge>
                <Badge variant="secondary">Solidity</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="glow">View Profile</Button>
            </CardFooter>
          </Card>

          <Card variant="glass" className="hover-glow transition-all">
            <CardHeader>
              <CardTitle>Glass Variant</CardTitle>
              <CardDescription>Subtle transparency and blur</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This variant uses the `.glass` utility for a modern, frosted look.
              </p>
            </CardContent>
          </Card>

          <Card variant="glow">
            <CardHeader>
              <CardTitle>Glow Variant</CardTitle>
              <CardDescription>Interactive hover effects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="destructive">Error</Badge>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Globe className="size-4" /> Public Website
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Github className="size-4" /> GitHub Project
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Separators</CardTitle>
              <CardDescription>Horizontal & Vertical</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-5 items-center space-x-4 text-sm">
                <div>Blog</div>
                <Separator orientation="vertical" />
                <div>Docs</div>
                <Separator orientation="vertical" />
                <div>Source</div>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">Standard theme-aware separators.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <footer className="pt-16 text-center">
        <p className="text-muted-foreground text-sm">
          SkillSphere Design System © 2026
        </p>
      </footer>
    </div>
  );
}