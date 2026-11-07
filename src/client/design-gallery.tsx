import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { AdSlot } from "@/components/ad-slot";
import { Banner } from "@/components/banner";
import { BossSection } from "@/components/boss-section";
import { CheckboxCard } from "@/components/checkbox-card";
import { ChoiceButton } from "@/components/choice-button";
import { FilterChip } from "@/components/filter-chip";
import { Lane, LaneMark, LaneSegment, Playhead, TimeAxis } from "@/components/lane";
import { OverlayLabel } from "@/components/overlay-label";
import { PlanCard, PlanFeatures } from "@/components/plan-card";
import { PullGroup } from "@/components/pull-group";
import { PullRow } from "@/components/pull-row";
import { UserMenuTrigger } from "@/components/user-menu-trigger";
import { VodCard } from "@/components/vod-card";
import { AppLogo } from "@/components/app-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CopyField } from "@/components/copy-field";
import { GuildMark } from "@/components/guild-mark";
import { OptionCard, OptionGroup } from "@/components/option-card";
import { PageHeader } from "@/components/page-header";
import { AppBrand, AppHeader } from "@/components/app-header";
import { Dot } from "@/components/dot";
import { NightTimeline, type TimelinePull } from "@/components/night-timeline";
import { Notice } from "@/components/notice";
import { NumberedStep } from "@/components/numbered-step";
import { PovAvatar, type WowClass } from "@/components/pov-avatar";
import { PullHpChart, type HpPull } from "@/components/pull-hp-chart";
import { StatChip } from "@/components/stat-chip";
import { StatStrip, StatTile } from "@/components/stat-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddVodChip, VodChip } from "@/components/vod-chip";

const SURFACES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["popover", "bg-popover"],
  ["secondary", "bg-secondary"],
  ["accent", "bg-accent"],
  ["border", "bg-border"],
  ["input", "bg-input"],
  ["border-strong", "bg-border-strong"],
  ["subtle-foreground", "bg-subtle-foreground"],
  ["muted-foreground", "bg-muted-foreground"],
  ["soft-foreground", "bg-soft-foreground"],
  ["foreground", "bg-foreground"],
] as const;

const SEMANTIC = [
  ["primary", "bg-primary"],
  ["success", "bg-success"],
  ["success-muted", "bg-success-muted"],
  ["warning", "bg-warning"],
  ["warning-muted", "bg-warning-muted"],
  ["destructive", "bg-destructive"],
  ["ring", "bg-ring"],
] as const;

const CLASS_SWATCHES = [
  ["class-death-knight", "bg-class-death-knight"],
  ["class-demon-hunter", "bg-class-demon-hunter"],
  ["class-druid", "bg-class-druid"],
  ["class-evoker", "bg-class-evoker"],
  ["class-hunter", "bg-class-hunter"],
  ["class-mage", "bg-class-mage"],
  ["class-monk", "bg-class-monk"],
  ["class-paladin", "bg-class-paladin"],
  ["class-priest", "bg-class-priest"],
  ["class-rogue", "bg-class-rogue"],
  ["class-shaman", "bg-class-shaman"],
  ["class-warlock", "bg-class-warlock"],
  ["class-warrior", "bg-class-warrior"],
] as const;

const CLASSES: WowClass[] = [
  "death-knight",
  "demon-hunter",
  "druid",
  "evoker",
  "hunter",
  "mage",
  "monk",
  "paladin",
  "priest",
  "rogue",
  "shaman",
  "warlock",
  "warrior",
];

const ROLES = [
  { value: "leader", label: "Leader" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const GUILDS = [
  { name: "Average Pillagers", leader: true, plus: true, stats: "17 members · 12 raids" },
  { name: "[Second guild]", leader: false, plus: false, stats: "6 members · 3 raids" },
];

interface MemberRow {
  name: string;
  role: string;
  vod: string;
  status: string;
  tone: "success" | "neutral" | "destructive";
  action: string;
  wowClass?: WowClass;
}

const MEMBERS: MemberRow[] = [
  {
    name: "Dispy",
    role: "Leader",
    vod: "Covers all 15 pulls",
    status: "Live",
    tone: "success",
    action: "",
  },
  {
    name: "Healgoesbrr",
    role: "Member",
    vod: "Covers pulls #5–#14",
    status: "Live",
    tone: "success",
    action: "Remove",
    wowClass: "druid",
  },
  {
    name: "Shrizzlinho",
    role: "Member",
    vod: "No VOD",
    status: "No VOD",
    tone: "neutral",
    action: "",
    wowClass: "demon-hunter",
  },
  {
    name: "Nydarri",
    role: "Member",
    vod: "Removed by Dispy",
    status: "Removed",
    tone: "destructive",
    action: "Allow again",
    wowClass: "monk",
  },
];

const PULLS = [
  { n: 1, kill: true, hp: 0, duration: "3:40", start: "14:10" },
  { n: 2, kill: false, hp: 71, duration: "2:30", start: "28:46" },
  { n: 3, kill: false, hp: 93, duration: "4:52", start: "31:35" },
  { n: 4, kill: false, hp: 52, duration: "4:39", start: "37:19" },
];

const NIGHT = 9495;

const TIMELINE: TimelinePull[] = [
  { id: 1, start: 300, end: 520, kill: true, label: "Pull 1 · kill" },
  { id: 2, start: 900, end: 1050, kill: false, label: "Pull 2 · wipe" },
  { id: 3, start: 1200, end: 1490, kill: false, label: "Pull 3 · wipe" },
  { id: 4, start: 3000, end: 3130, kill: false, label: "Pull 4 · wipe" },
  { id: 5, start: 3300, end: 3790, kill: true, label: "Pull 5 · kill" },
  { id: 6, start: 6000, end: 6330, kill: false, label: "Pull 6 · wipe" },
  { id: 7, start: 6500, end: 6810, kill: false, label: "Pull 7 · wipe" },
  { id: 8, start: 8000, end: 8480, kill: true, label: "Pull 8 · kill" },
];

const WIPE_HP = [71, 93, 88, 52, 90, 47, 61, 38, 91, 86, 44, 97, 78, 12, 22];

const HP: HpPull[] = [...WIPE_HP, 0].map((hp, i) => ({ n: i + 1, hp, kill: hp === 0 }));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Swatches({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
      {items.map(([name, bg]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <div className={`h-10 rounded-md border ${bg}`} />
          <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** Every theme token and component in one place. Dev reference at /design. */
export function DesignGallery() {
  return (
    <div className="min-h-screen">
      <AppHeader>
        <AppBrand />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Raids</BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Design gallery</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<UserMenuTrigger name="Felix" />} />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Signed in as Felix</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </AppHeader>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-10">
        <Section title="Colors">
          <Swatches items={SURFACES} />
          <Swatches items={SEMANTIC} />
          <Swatches items={CLASS_SWATCHES} />
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-1.5">
            <span className="text-[28px] font-semibold tracking-tight">Display 28 / 600</span>
            <span className="text-[22px] font-semibold tracking-tight">Page title 22 / 600</span>
            <span className="text-sm">Body 14</span>
            <span className="text-[13px]">Base 13</span>
            <span className="text-xs text-muted-foreground">Secondary 12</span>
            <span className="font-mono text-xs tabular-nums">Mono 12 · 2:38:15 · +6.0s · #14</span>
          </div>
        </Section>

        <Section title="Buttons">
          <Row label="Variants">
            <Button>Review pulls</Button>
            <Button variant="outline">Members and access</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Remove</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="Sizes">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button>default</Button>
            <Button size="lg">lg</Button>
            <Button size="xl">xl</Button>
          </Row>
        </Section>

        <Section title="Badges and chips">
          <Row label="Badge">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="leader">Leader</Badge>
            <Badge variant="member">Member</Badge>
            <Badge variant="success">Plus · from Felix</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Removed</Badge>
            <Badge variant="outline">Outline</Badge>
          </Row>
          <Row label="Stat chip">
            <StatChip tone="success" value={3}>
              kill
            </StatChip>
            <StatChip tone="neutral" value={17}>
              wipes
            </StatChip>
            <StatChip value={2}>bosses</StatChip>
          </Row>
          <Row label="VOD chips">
            <VodChip name="Dispy" offset="+6.0s" active />
            <VodChip name="Healgoesbrr" offset="-1.2s" wowClass="druid" />
            <VodChip name="Larill" offset="+0.4s" wowClass="death-knight" />
            <AddVodChip />
          </Row>
          <Row label="Avatars">
            <PovAvatar name="Dispy" />
            <PovAvatar name="Healgoesbrr" wowClass="druid" />
            <PovAvatar name="Larill" wowClass="death-knight" />
            <PovAvatar name="Shenteng" wowClass="shaman" />
            <PovAvatar name="Shrizzlinho" wowClass="demon-hunter" />
            <PovAvatar name="Nydarri" wowClass="monk" size="lg" />
          </Row>
          <Row label="Every class ring">
            {CLASSES.map((wowClass) => (
              <PovAvatar key={wowClass} name={wowClass} wowClass={wowClass} />
            ))}
          </Row>
          <Row label="Dots and keys">
            <Dot tone="success" />
            <Dot tone="neutral" />
            <Dot tone="warning" />
            <Dot tone="destructive" />
            <Dot tone="neutral" hollow />
            <Kbd>j</Kbd>
            <Kbd>k</Kbd>
            <Kbd>space</Kbd>
          </Row>
        </Section>

        <Section title="Forms">
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Warcraft Logs report</FieldLabel>
              <Input className="font-mono" placeholder="https://www.warcraftlogs.com/reports/…" />
              <FieldDescription>Paste the report link.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select items={ROLES} defaultValue="member">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea placeholder="Anything the raid should know" />
            </Field>
            <label className="flex items-center gap-2">
              <Checkbox defaultChecked /> Public link
            </label>
            <label className="flex items-center gap-2">
              <Switch defaultChecked /> Side by side
            </label>
          </div>
        </Section>

        <Section title="Tabs, toggles, menus">
          <Row label="Tabs">
            <Tabs defaultValue="boss-1">
              <TabsList>
                <TabsTrigger value="boss-1">Boss 1</TabsTrigger>
                <TabsTrigger value="ulatek">Ula'tek</TabsTrigger>
                <TabsTrigger value="boss-2">Boss 2</TabsTrigger>
              </TabsList>
            </Tabs>
          </Row>
          <Row label="Pill tabs">
            <Tabs defaultValue="ulatek">
              <TabsList variant="pill">
                <TabsTrigger value="boss-1">Boss 1</TabsTrigger>
                <TabsTrigger value="ulatek">Ula'tek</TabsTrigger>
                <TabsTrigger value="boss-2">Boss 2</TabsTrigger>
              </TabsList>
            </Tabs>
          </Row>
          <Row label="Segmented tabs (billing)">
            <Tabs defaultValue="monthly">
              <TabsList variant="segmented">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </Row>
          <Row label="Toggle group">
            <ToggleGroup defaultValue={["all"]}>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="kills">Kills</ToggleGroupItem>
              <ToggleGroupItem value="wipes">Wipes</ToggleGroupItem>
            </ToggleGroup>
          </Row>
          <Row label="Overlays">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Felix <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Signed in as Felix</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuItem>Manage guilds</DropdownMenuItem>
                <DropdownMenuItem>Remove ads with Plus</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
              <PopoverContent>Recorded by Dispy</PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>Tooltip</TooltipTrigger>
              <TooltipContent>Previous pull</TooltipContent>
            </Tooltip>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove VOD</DialogTitle>
                  <DialogDescription>Leaders and the uploader can remove it.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive">Remove</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Row>
        </Section>

        <Section title="Data">
          <StatStrip>
            <StatTile label="Pulls" value={20} />
            <StatTile label="Kills" value={3} valueClassName="text-success" />
            <StatTile label="Wipes" value={17} />
            <StatTile label="Deaths" value={64} valueClassName="text-destructive-text" />
            <StatTile label="Best wipe" value="12%" />
          </StatStrip>

          <NightTimeline duration={NIGHT} pulls={TIMELINE} />

          <Card>
            <CardHeader>
              <CardTitle>Boss HP at the end of each pull</CardTitle>
              <CardDescription>Ula'tek</CardDescription>
            </CardHeader>
            <CardContent>
              <PullHpChart pulls={HP} best={12} bestLabel="Best 12%" />
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pull</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Boss HP</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Deaths</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HP.slice(-4).map((pull) => (
                  <TableRow key={pull.n}>
                    <TableCell className="font-mono">#{pull.n}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Dot tone={pull.kill ? "success" : "neutral"} />
                        {pull.kill ? "Kill" : "Wipe"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{pull.hp}%</TableCell>
                    <TableCell className="font-mono text-muted-foreground">3:02</TableCell>
                    <TableCell className="font-mono text-destructive-text">2</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Guilds and access">
          <PageHeader
            title="Members and access"
            subtitle="Guild review for Average Pillagers."
            actions={<Button variant="outline">Back to raid</Button>}
          />
          <div className="overflow-hidden rounded-lg border">
            {GUILDS.map((guild) => (
              <div
                key={guild.name}
                className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b bg-card px-4 py-3.5 last:border-b-0"
              >
                <GuildMark name={guild.name} />
                <div className="flex min-w-40 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{guild.name}</span>
                    <Badge variant={guild.leader ? "leader" : "member"}>
                      {guild.leader ? "Leader" : "Member"}
                    </Badge>
                    {guild.plus && <Badge variant="success">Plus · from Felix</Badge>}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{guild.stats}</span>
                </div>
                <span className="flex-1" />
                {guild.leader && <Button variant="outline">Members and access</Button>}
                <Button variant="outline">Open raids</Button>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[360px_1fr]">
            <Card variant="panel">
              <CardHeader>
                <CardTitle className="text-[13px] font-semibold">Who can view</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <OptionGroup defaultValue="link">
                  <OptionCard
                    value="link"
                    label="Anyone with the link"
                    note="No sign-in needed to watch."
                  />
                  <OptionCard
                    value="guild"
                    label="Average Pillagers members"
                    note="Sign in with a guild account to watch."
                  />
                </OptionGroup>
                <CopyField value="pull-sync.app/r/ap-main-1029" label="Share link" />
              </CardContent>
            </Card>
            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>VOD</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MEMBERS.map((member) => (
                    <TableRow key={member.name}>
                      <TableCell>
                        <span className="flex items-center gap-2.5 font-medium">
                          <PovAvatar name={member.name} wowClass={member.wowClass} />
                          {member.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-soft-foreground">{member.role}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{member.vod}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <Dot tone={member.tone} hollow={member.status === "No VOD"} />
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.action && (
                          <Button size="xs" variant="outline">
                            {member.action}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Section>

        <Section title="Sign in">
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-7 text-center">
            <AppLogo className="size-10" />
            <div className="flex flex-col gap-2">
              <span className="text-[26px] font-semibold tracking-tight">pull-sync</span>
              <span className="text-[15px] text-muted-foreground">
                Watch your raid, pull by pull, next to the logs.
              </span>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button size="xl">Continue with Battle.net</Button>
              <Button size="xl" variant="outline" className="bg-popover font-medium">
                Continue with Discord
              </Button>
            </div>
            <p className="text-xs text-subtle-foreground">
              New accounts are created the first time you sign in.
            </p>
          </div>
        </Section>

        <Section title="Library">
          <Field>
            <FieldLabel>Who is this review for?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <ChoiceButton label="Only me" note="Private" />
              <ChoiceButton label="Average Pillagers" note="Guild members" selected />
              <ChoiceButton label="[Second guild]" note="Guild members" />
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[13px] font-semibold">Raids</h3>
            <Input
              className="h-6.5 w-55 rounded-full px-2.5 text-xs"
              placeholder="Find raids with a character"
              aria-label="Find raids with a character"
            />
            <span className="flex-1" />
            <Tabs defaultValue="all">
              <TabsList variant="pill">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="mine">Mine</TabsTrigger>
                <TabsTrigger value="guild">Guild</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raid</TableHead>
                  <TableHead>Shared with</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>VODs</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="font-medium">AP Main Raid</span>
                      <span className="text-xs text-muted-foreground">
                        3 bosses · Ula'tek, [Boss 1], [Boss 2]
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-soft-foreground">Average Pillagers</TableCell>
                  <TableCell className="font-mono text-xs text-soft-foreground">
                    29 Oct 2026
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="text-success">3</span>{" "}
                    <span className="text-muted-foreground">kill · 17 wipes</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-soft-foreground">2</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">Today</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Shared review">
          <Banner>
            <span>
              You're viewing a shared review from{" "}
              <span className="font-medium text-foreground">Average Pillagers</span>. Guild members
              can sign in to add their own VOD.
            </span>
          </Banner>
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <BossSection
              name="Ula'tek"
              stats={
                <>
                  <span className="text-success">1</span> kill · 15 wipes · best 12%
                </>
              }
              action={
                <Button size="sm" variant="outline">
                  Boss progress
                </Button>
              }
            >
              {PULLS.map((pull) => (
                <PullRow
                  key={pull.n}
                  n={pull.n}
                  kill={pull.kill}
                  hp={pull.hp}
                  duration={pull.duration}
                  start={pull.start}
                />
              ))}
            </BossSection>
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold">Watch from a player's view</h3>
              <VodCard name="Dispy" note="Covers all 15 pulls" />
              <VodCard
                name="Healgoesbrr"
                wowClass="druid"
                tag={<Badge variant="member">You</Badge>}
                offset="+6.0s"
                coverage={{ from: 25, to: 70 }}
                note="Covers pulls #5–#14"
              />
              <VodCard
                name="Larill"
                wowClass="death-knight"
                tag={<Badge variant="warning">Pending</Badge>}
                offset="-1.2s"
                coverage={{ from: 0, to: 40 }}
                note="YouTube · added 12 min ago"
              />
              <AdSlot
                size="rectangle"
                sponsor="[Advertiser]"
                message="One short line about the offer goes here."
                action={
                  <Button size="sm" variant="outline">
                    Learn more
                  </Button>
                }
              />
            </div>
          </div>
        </Section>

        <Section title="Pull review">
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-2">
              <div className="relative flex h-56 items-center justify-center rounded-lg border bg-card">
                <OverlayLabel>
                  <Dot />
                  <span className="font-medium">Dispy</span>
                  <span className="text-soft-foreground">Pull #12 · Wipe · 86%</span>
                </OverlayLabel>
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyTitle>No video for this pull</EmptyTitle>
                    <EmptyDescription>This VOD doesn't cover the pull.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border bg-card px-4 py-2 font-mono text-xs tabular-nums">
                <span className="text-[13px]">
                  1:11:20<span className="text-muted-foreground"> / 2:38:15</span>
                </span>
                <span className="text-muted-foreground">
                  pull <span className="text-foreground">#12</span> ·{" "}
                  <span className="text-foreground">0:42</span> in
                </span>
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  Dispy offset
                  <Input
                    className="h-6 w-20 px-2 text-right font-mono text-xs"
                    defaultValue="+6.0s"
                    aria-label="Sync offset"
                  />
                </label>
                <span className="flex-1" />
                <span className="inline-flex items-center gap-3.5 font-sans text-muted-foreground">
                  <span>
                    <Kbd>j</Kbd> prev
                  </span>
                  <span>
                    <Kbd>k</Kbd> next
                  </span>
                  <span>
                    <Kbd>d</Kbd> next death
                  </span>
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex h-9 items-center justify-between border-b pr-3 pl-4 text-xs text-muted-foreground">
                <span>Pulls</span>
                <span className="font-mono">20 total</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <PullGroup name="Ula'tek" summary="1 / 16 · 12%">
                  {PULLS.map((pull) => (
                    <PullRow
                      key={pull.n}
                      variant="compact"
                      n={pull.n}
                      kill={pull.kill}
                      hp={pull.hp}
                      duration={pull.duration}
                      selected={pull.n === 3}
                    />
                  ))}
                </PullGroup>
                <PullGroup name="[Boss 2]" summary="1 / 4 · 22%" defaultOpen={false}>
                  <PullRow variant="compact" n={17} kill={false} hp={64} duration="3:30" />
                </PullGroup>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-4 py-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[13px]">
                <span className="font-semibold">Pull #12</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">· Wipe · 86% · 2:16</span>
              </span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">Show events</span>
              <FilterChip label="Eggs" swatchClassName="bg-warning" on />
              <FilterChip label="Soaks" swatchClassName="bg-success" on />
              <FilterChip label="Tank swaps" swatchClassName="bg-ring" />
            </div>
            <TimeAxis
              ticks={[
                { at: 0, label: "0:00" },
                { at: 50, label: "1:08" },
                { at: 95, label: "2:16" },
              ]}
            />
            <Lane label="Phases" className="h-5.5 overflow-hidden">
              <LaneSegment from={0} to={35}>
                Phase 1
              </LaneSegment>
              <LaneSegment from={35} to={80}>
                Phase 2
              </LaneSegment>
              <LaneSegment from={80} to={100}>
                Phase 3
              </LaneSegment>
              <Playhead at={42} />
            </Lane>
            <Lane
              label={
                <>
                  Deaths <span className="font-mono text-destructive-text">2</span>
                </>
              }
              className="h-16"
            >
              <LaneMark tone="destructive" from={30} className="inset-y-0 w-0.5" />
              <LaneMark tone="destructive" from={64} className="inset-y-0 w-0.5" />
              <Playhead at={42} />
            </Lane>
            <Lane label="Eggs">
              <LaneMark tone="warning" from={10} to={14} />
              <LaneMark tone="warning" from={44} to={48} />
              <Playhead at={42} />
            </Lane>
          </div>
        </Section>

        <Section title="Plus">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <span className="text-[26px] font-semibold tracking-tight">pull-sync Plus</span>
              <span className="text-[15px] text-muted-foreground">
                When one member has Plus, the whole guild is ad-free.
              </span>
            </div>
            <div className="flex justify-center">
              <Tabs defaultValue="monthly">
                <TabsList variant="segmented">
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <PlanCard name="Free" price="0">
                <PlanFeatures
                  items={["Everything in pull-sync", "Small banner ads on a few screens"]}
                />
                <span className="mt-auto flex h-9.5 items-center justify-center rounded-lg border text-muted-foreground">
                  Your current plan
                </span>
              </PlanCard>
              <PlanCard name="Plus" price="€3" per="per month" featured>
                <PlanFeatures
                  included
                  items={[
                    "No ads on any screen",
                    "Ad-free for every member of the guilds you pick",
                  ]}
                />
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Make these guilds ad-free</span>
                  <CheckboxCard label="Average Pillagers" note="17 members" defaultChecked />
                  <CheckboxCard label="[Second guild]" note="6 members" />
                </div>
                <Button size="xl" className="mt-auto h-9.5">
                  Upgrade to Plus
                </Button>
              </PlanCard>
            </div>
          </div>
        </Section>

        <Section title="Layout pieces">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-6 rounded-lg border bg-card p-6">
              <NumberedStep step={1} title="Recording">
                <Input className="font-mono" defaultValue="https://www.youtube.com/watch?v=…" />
              </NumberedStep>
              <NumberedStep step={2} title="Offset">
                <span className="font-mono text-[28px] tabular-nums">+6.0s</span>
              </NumberedStep>
              <Notice>Your VOD goes live as soon as you save.</Notice>
            </div>
            <div className="flex flex-col gap-4">
              <Progress value={62} />
              <Skeleton className="h-8 w-full" />
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No VODs yet</EmptyTitle>
                  <EmptyDescription>Add a recording to start reviewing.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Ad: bar (with Plus footnote)</span>
            <AdSlot
              sponsor="[Advertiser]"
              message="One short line about the offer goes here."
              action={
                <Button size="sm" variant="outline">
                  Learn more
                </Button>
              }
              footnote="Ads keep pull-sync free. Remove ads with Plus"
            />
          </div>
          <div className="flex max-w-80 flex-col gap-2">
            <span className="text-xs text-muted-foreground">Ad: compact (side panels)</span>
            <AdSlot
              size="compact"
              sponsor="[Advertiser]"
              message="One short line."
              action={
                <Button size="xs" variant="outline">
                  Learn more
                </Button>
              }
            />
          </div>
        </Section>
      </main>
    </div>
  );
}
