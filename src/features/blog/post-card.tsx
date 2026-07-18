import Image from "next/image";
import Link from "next/link";

import { formatPostDate, type PostCard as PostCardData } from "@/features/blog/queries";
import { mediaUrl } from "@/features/media/url";
import { cn } from "@/lib/utils";

/**
 * One post, as a card.
 *
 * Shared by the index, the category pages and the tag pages so a post looks the
 * same wherever it is listed. The whole card is one link rather than a card with
 * a link in it: the target is the post, and a person clicking the picture means
 * the same thing as a person clicking the title.
 */

/**
 * The picture, or the kanji standing in for it.
 *
 * There is no placeholder image and no grey box. A post without a featured image
 * gets its category's kanji on a wash of sakura — which is a design, where a
 * broken-image icon is an apology. It also means the blog reads properly before
 * anyone has uploaded a single file, which is the state it is in today.
 */
function Thumb({ post, sizes, className }: { post: PostCardData; sizes: string; className?: string }) {
  const url = post.featuredImage ? mediaUrl(post.featuredImage.path) : null;

  if (!url) {
    return (
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-sakura/12 via-petal/40 to-transparent",
          className
        )}
      >
        <span
          aria-hidden="true"
          className="font-heading text-5xl text-sakura/25 select-none sm:text-6xl"
        >
          {post.category?.kanji ?? "書"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      <Image
        src={url}
        // Empty: the title is right there and reads as the link's name. A screen
        // reader announcing the description as well would say the same thing
        // twice on the way to one destination.
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </div>
  );
}

function Meta({ post }: { post: PostCardData }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {post.author ? <span>{post.author.displayName}</span> : null}
      {post.author && post.publishedAt ? <span aria-hidden="true">·</span> : null}
      {post.publishedAt ? (
        <time dateTime={post.publishedAt.toISOString()}>{formatPostDate(post.publishedAt)}</time>
      ) : null}
      <span aria-hidden="true">·</span>
      <span className="tabular">{post.readingMinutes} min read</span>
    </p>
  );
}

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <article className="min-w-0">
      <Link href={`/blog/${post.slug}`} className="group block min-w-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Thumb post={post} className="aspect-16/10 w-full" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" />

        {post.category ? (
          <p className="mt-4 font-heading text-[0.7rem] font-semibold tracking-[0.18em] text-sakura uppercase">
            {post.category.name}
          </p>
        ) : null}

        <h3 className="mt-2 font-heading text-lg leading-snug font-semibold tracking-wide text-balance transition-colors group-hover:text-sakura">
          {post.title}
        </h3>

        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-pretty text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}

        <Meta post={post} />
      </Link>
    </article>
  );
}

/** The lead story. Same card, given the width to behave like one. */
export function FeaturedPostCard({ post }: { post: PostCardData }) {
  return (
    <article className="min-w-0">
      <Link
        href={`/blog/${post.slug}`}
        className="group grid min-w-0 gap-6 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-2 md:items-center md:gap-10"
      >
        <Thumb post={post} className="aspect-16/10 w-full" sizes="(min-width: 768px) 50vw, 92vw" />

        <div className="min-w-0">
          <p className="flex items-center gap-2 font-heading text-[0.7rem] font-semibold tracking-[0.18em] uppercase">
            <span className="text-sakura">Featured</span>
            {post.category ? (
              <>
                <span aria-hidden="true" className="text-border">
                  /
                </span>
                <span className="text-muted-foreground">{post.category.name}</span>
              </>
            ) : null}
          </p>

          <h2 className="mt-3 font-heading text-2xl leading-tight font-semibold tracking-wide text-balance transition-colors group-hover:text-sakura sm:text-3xl">
            {post.title}
          </h2>

          {post.excerpt ? (
            <p className="mt-3 text-pretty text-muted-foreground">{post.excerpt}</p>
          ) : null}

          <Meta post={post} />
        </div>
      </Link>
    </article>
  );
}
