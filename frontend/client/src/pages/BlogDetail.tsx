import React, { useEffect } from "react";
import { useRoute, Link } from "wouter";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { blogPosts } from "@/data/blogData";

export default function BlogDetail() {
  const [, params] = useRoute("/blogs/:slug");
  const post = blogPosts.find((p) => p.slug === params?.slug);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Nairobi DevOps Community`;
    }
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-12">
          <h1 className="text-2xl font-bold">Article not found</h1>
          <p className="mt-2">
            The requested blog post could not be found.{" "}
            <Link href="/blogs" className="text-primary underline">
              Back to blogs
            </Link>
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <article className="pb-12">
          <header className="bg-slate-50 border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8">
              <p className="text-sm text-blue-700 bg-blue-50 inline-flex px-2 py-1 rounded">
                {post.category}
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{post.title}</h1>
              <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
                <img
                  src={post.author.avatar}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                  loading="lazy"
                />
                <span>
                  {post.author.name} ·{" "}
                  {new Date(post.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </header>

          <img
            src={post.cover.url}
            alt={post.cover.alt}
            width={post.cover.width}
            height={post.cover.height}
            loading="lazy"
            className="w-full h-[360px] object-cover"
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl prose prose-slate prose-headings:scroll-mt-20 py-8">
            {post.content.map((block, idx) => {
              if (block.type === "h2") return <h2 key={idx}>{block.text}</h2>;
              if (block.type === "ul")
                return (
                  <ul key={idx}>
                    {block.items?.map((i, j) => (
                      <li key={j}>{i}</li>
                    ))}
                  </ul>
                );
              return <p key={idx}>{block.text}</p>;
            })}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
