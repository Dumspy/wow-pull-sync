import { cn } from "@/lib/utils";

/** Wowhead's icon CDN, keyed by the icon name without its extension. */
function iconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/small/${icon.replace(/\.[a-z]+$/i, "").toLowerCase()}.jpg`;
}

/** A spell's icon, or an empty square when the report has none. */
function SpellIcon({ icon, className }: { icon: string | null; className?: string }) {
  if (icon == null) {
    return (
      <span
        data-slot="spell-icon"
        aria-hidden="true"
        className={cn("inline-block size-4 shrink-0 rounded-xs bg-secondary", className)}
      />
    );
  }

  return (
    <img
      data-slot="spell-icon"
      src={iconUrl(icon)}
      alt=""
      loading="lazy"
      className={cn("inline-block size-4 shrink-0 rounded-xs", className)}
    />
  );
}

export { SpellIcon };
