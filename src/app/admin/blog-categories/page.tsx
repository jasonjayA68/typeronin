import type { Metadata } from "next";

import { CategoryRowActions, NewCategoryButton } from "@/features/admin/category-editor";
import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Panel,
  StatusDot,
  Td,
  Th,
  Tr,
} from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Blog categories",
  robots: { index: false, follow: false },
};

async function getCategories() {
  return prisma.blogCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      intro: true,
      sort: true,
      isActive: true,
      _count: { select: { posts: true } },
    },
  });
}

export default async function BlogCategoriesPage() {
  await requirePermission("blog:write");
  const categories = await getCategories();

  const filed = categories.reduce((sum, c) => sum + c._count.posts, 0);

  return (
    <AdminPage
      title="Blog categories"
      description="Groups that blog posts are sorted into. Order decides which shows first. Turning a category off keeps it but hides it from readers."
      actions={<NewCategoryButton />}
    >
      <Panel
        title="Categories"
        action={
          categories.length ? (
            <span className="text-xs text-muted-foreground">
              <span className="tabular">{categories.length}</span> categories holding{" "}
              <span className="tabular">{filed}</span> {filed === 1 ? "post" : "posts"}
            </span>
          ) : null
        }
      >
        {categories.length ? (
          <DataTable>
            <caption className="sr-only">
              Blog categories in order, with the number of posts in each.
            </caption>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Web address</Th>
                <Th numeric>Posts</Th>
                <Th numeric>Order</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Tr key={category.id}>
                  <Td>
                    <span className="block max-w-[14rem] truncate font-medium">
                      {category.name}
                    </span>
                    {category.description ? (
                      <span className="mt-0.5 block max-w-[14rem] truncate text-xs text-muted-foreground">
                        {category.description}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <code className="text-xs text-muted-foreground">{category.slug}</code>
                  </Td>
                  <Td numeric>
                    <span className={category._count.posts > 0 ? "text-sakura" : undefined}>
                      {category._count.posts.toLocaleString("en-US")}
                    </span>
                  </Td>
                  <Td numeric className="text-muted-foreground">
                    {category.sort.toLocaleString("en-US")}
                  </Td>
                  <Td>
                    <StatusDot tone={category.isActive ? "on" : "off"}>
                      {category.isActive ? "On" : "Hidden"}
                    </StatusDot>
                  </Td>
                  <Td className="text-right">
                    <CategoryRowActions
                      postCount={category._count.posts}
                      category={{
                        id: category.id,
                        name: category.name,
                        slug: category.slug,
                        description: category.description ?? "",
                        intro: category.intro ?? "",
                        sort: category.sort,
                        isActive: category.isActive,
                      }}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No categories yet" action={<NewCategoryButton />}>
            Categories are optional. A post can be published without one. They help once there are
            enough posts that readers need a way to find things.
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
