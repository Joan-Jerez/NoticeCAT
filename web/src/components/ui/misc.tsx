import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatShortDate, formatTime, initials, relativeOrDate } from "@/lib/format";
import type { ArticleStatus, Image as Img, Organization } from "@/lib/types";

export function Eyebrow({ href, children, tone = "accent", className }: { href?: string; children: ReactNode; tone?: "accent" | "muted" | "neutral"; className?: string }) {
  const color = { accent: "text-accent", muted: "text-text-muted", neutral: "text-neutral" }[tone];
  const cls = cx("eyebrow", color, className);
  return href ? (
    <Link href={href} className={cx(cls, "relative z-10 hover:underline")}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function Timestamp({ iso, org, withDate = true, relative = false, className }: { iso: string; org: Organization; withDate?: boolean; relative?: boolean; className?: string }) {
  const rel = relative ? relativeOrDate(iso, org) : null;
  return (
    <time dateTime={iso} className={cx("text-caption text-text-muted", className)}>
      {rel ?? (
        <>
          {withDate && <>{formatShortDate(iso, org)} · </>}
          <b className="font-semibold">{formatTime(iso, org)}</b>
        </>
      )}
    </time>
  );
}

const avatarSizes = { 24: "size-6 text-eyebrow", 32: "size-8 text-caption", 48: "size-12 text-ui", 96: "size-24 text-title" } as const;

export function Avatar({ name, photo, size = 32, decorative = true }: { name: string; photo: Img | null; size?: keyof typeof avatarSizes; decorative?: boolean }) {
  const cls = cx("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-tint font-semibold text-accent", avatarSizes[size]);
  if (photo) {
    return (
      <span className={cls}>
        <Image src={photo.src} alt={decorative ? "" : name} fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : name}>
      {initials(name)}
    </span>
  );
}

const status: Record<ArticleStatus, [string, string]> = {
  published: ["Publicado", "bg-success-bg text-success before:bg-success"],
  scheduled: ["Programado", "bg-warning-bg text-warning before:bg-warning"],
  draft: ["Borrador", "bg-neutral-bg text-neutral before:bg-neutral"],
  archived: ["Archivado", "bg-neutral-bg text-neutral before:bg-neutral"],
};

export function StatusChip({ value }: { value: ArticleStatus }) {
  const [label, cls] = status[value];
  return <span className={cx("eyebrow inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs px-2 py-1 before:size-1.5 before:rounded-full before:content-['']", cls)}>{label}</span>;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xs border border-border bg-raised px-6 py-10 text-center">
      <Icon className="mx-auto size-8 text-text-muted" aria-hidden />
      <p className="mt-3 font-display text-title-sm">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-card text-ui text-text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BlockHeading({ id, children, href, linkLabel = "Ver todo" }: { id?: string; children: ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-text pb-2">
      <h2 id={id} className="font-display text-heading">
        {children}
      </h2>
      {href && (
        <Link href={href} className="text-ui-sm font-semibold text-accent hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
