"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import type { ReactNode } from "react";

import { MediaImage } from "@/features/blog/image-node";
import { MediaPicker } from "@/features/media/media-picker";
import { mediaUrl } from "@/features/media/url";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * The body editor.
 *
 * What it can do is bounded by the allowlist in document.ts, and that is the
 * intended direction of the dependency: the schema decides what a post may
 * contain, and this offers exactly that. Enabling a StarterKit extension whose
 * node the parser does not know would produce an editor that lets someone write
 * something the save then rejects — so the two lists are kept in step by hand,
 * and this is the file that has to change second.
 */

/** Everything StarterKit brings that this product does not want. */
const editorExtensions = [
  StarterKit.configure({
    // H1 is the post title, rendered by the page from the `title` column. The
    // parser refuses level 1 for the same reason; this stops it being offered.
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      // Belt and braces with the parser's own check. This one runs while typing
      // and stops a pasted `javascript:` URL from ever becoming a mark; the
      // parser's runs on the way to the database and is the one that counts.
      protocols: ["http", "https", "mailto"],
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer" },
    },
  }),
  MediaImage,
];

/* ---------------------------------------------------------------- toolbar */

function ToolButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={active ? "secondary" : "ghost"}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      // The editor loses its selection to a focused button, and formatting the
      // text you had selected is the entire job. Keep the focus where it was.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** The link dialog. A window.prompt would block the page and cannot be styled. */
function LinkDialog({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  const apply = () => {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    }
    setOpen(false);
  };

  return (
    <>
      <ToolButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          // Pre-fill from the link under the cursor, so opening this on an
          // existing link is an edit rather than a retype.
          setHref(editor.getAttributes("link").href ?? "");
          setOpen(true);
        }}
      >
        Link
      </ToolButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link</DialogTitle>
            <DialogDescription>
              A full web address, or a path on this site such as /blog/typing-tips. Empty the box to
              remove the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="link-href">Address</Label>
            <Input
              id="link-href"
              value={href}
              autoFocus
              placeholder="https://example.com"
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={apply}>
              {href.trim() ? "Apply" : "Remove link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  /**
   * Tiptap 3 stopped re-rendering the React tree on every transaction, which is
   * why this hook exists rather than reading `editor.isActive(...)` inline: a
   * toolbar that reads state during render would show whatever was true when the
   * component last happened to render, and would sit there insisting the cursor
   * is in a heading long after it left one.
   */
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      h4: current.isActive("heading", { level: 4 }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      codeBlock: current.isActive("codeBlock"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  if (!state) return null;

  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      <ToolButton title="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <span className="font-semibold">B</span>
      </ToolButton>
      <ToolButton title="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton
        title="Underline"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolButton>
      <ToolButton title="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolButton>
      <ToolButton title="Inline code" active={state.code} onClick={() => chain().toggleCode().run()}>
        <span className="font-mono">{"<>"}</span>
      </ToolButton>

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      <ToolButton
        title="Heading 2"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        title="Heading 3"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <ToolButton
        title="Heading 4"
        active={state.h4}
        onClick={() => chain().toggleHeading({ level: 4 }).run()}
      >
        H4
      </ToolButton>

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      <ToolButton
        title="Bulleted list"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        List
      </ToolButton>
      <ToolButton
        title="Numbered list"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        1.
      </ToolButton>
      <ToolButton
        title="Quote"
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        Quote
      </ToolButton>
      <ToolButton
        title="Code block"
        active={state.codeBlock}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        Code
      </ToolButton>
      <ToolButton title="Divider" onClick={() => chain().setHorizontalRule().run()}>
        ―
      </ToolButton>

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      <LinkDialog editor={editor} />

      <MediaPicker
        heading="Insert an image"
        description="Pick a file from the media library. Change its description there later and this post updates too."
        trigger={
          <Button type="button" size="xs" variant="ghost" title="Insert image">
            Image
          </Button>
        }
        onPick={(media) => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "image",
              attrs: {
                mediaId: media.id,
                // Inherited from the library at insert time, and editable after.
                alt: media.altText,
                caption: null,
                // Display only — document.ts strips this on the way to the column.
                src: mediaUrl(media.path),
              },
            })
            .run();
        }}
      />

      <span className="ml-auto flex gap-1">
        <ToolButton title="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          Undo
        </ToolButton>
        <ToolButton title="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          Redo
        </ToolButton>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- editor */

export function BodyEditor({
  initialContent,
  onChange,
  disabled,
}: {
  /** Already hydrated — image nodes carry a `src`. See image-node.tsx. */
  initialContent: unknown;
  /** Fires on every keystroke. The parent holds the value; nothing is sent. */
  onChange: (document: unknown) => void;
  disabled?: boolean;
}) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent as never,
    editable: !disabled,
    // Required under SSR. Rendering immediately makes the server's HTML and the
    // client's first paint disagree, and React resolves that by throwing the
    // editor away and rebuilding it — a hydration error and a visible flash.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-80 max-w-none px-1 py-4 leading-relaxed outline-none",
          // ProseMirror renders raw tags; the document's own typography is
          // applied here so the editor reads roughly as the article will.
          "[&_h2]:font-heading [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-wide",
          "[&_h3]:font-heading [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-wide",
          "[&_h4]:font-heading [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold",
          "[&_p]:my-4",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-sakura/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
          "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-4 [&_pre]:text-xs",
          "[&_hr]:my-8 [&_hr]:border-border",
          "[&_a]:text-sakura [&_a]:underline [&_a]:underline-offset-4"
        ),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  if (!editor) {
    // The first render under SSR, and the one after it until the editor mounts.
    // A box of the right height, so the page does not jump when it arrives.
    return <div className="min-h-80 rounded-lg border border-border" aria-busy="true" />;
  }

  return (
    <div className="min-w-0">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
