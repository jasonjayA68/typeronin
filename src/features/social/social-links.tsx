import { SOCIAL_INFO, activeSocials } from "@/features/social/config";
import { getSocialLinks } from "@/features/social/service";
import { cn } from "@/lib/utils";

/**
 * The social links, rendered.
 *
 * Social is the product's contact channel — there is no support inbox and no
 * ticket form, so these links are how a student reaches the house. That makes
 * them worth having in one component rather than four: the footer, the contact
 * page and both legal pages all show the same set, and a network added in the
 * admin panel must appear in every one of them without anybody remembering to
 * go and add it.
 *
 * Two shapes for the same data. `icons` is the bare glyph row the footer has
 * always used. `named` spells the platform out, for the places where the link is
 * the point rather than an ornament — a row of unlabelled glyphs is decoration,
 * and decoration is not a contact route.
 *
 * Renders nothing at all when no link is set. An operator who has not filled the
 * panel in yet gets silence rather than an empty box promising contact that does
 * not exist; the callers that need to say something in that case check
 * `hasSocialLinks` and say it themselves.
 */

export async function hasSocialLinks(): Promise<boolean> {
  return activeSocials(await getSocialLinks()).length > 0;
}

export async function SocialLinks({
  variant = "icons",
  className,
}: {
  variant?: "icons" | "named";
  className?: string;
}) {
  const socials = activeSocials(await getSocialLinks());
  if (socials.length === 0) return null;

  if (variant === "icons") {
    return (
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {socials.map(({ platform, url }) => (
          <li key={platform}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={SOCIAL_INFO[platform].label}
              title={SOCIAL_INFO[platform].label}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-sakura/40 hover:text-sakura"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                <path d={SOCIAL_INFO[platform].icon} />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {socials.map(({ platform, url }) => (
        <li key={platform}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-sakura/40 hover:text-sakura"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 fill-current">
              <path d={SOCIAL_INFO[platform].icon} />
            </svg>
            {SOCIAL_INFO[platform].label}
          </a>
        </li>
      ))}
    </ul>
  );
}
