import React, { useEffect } from "react";
import { Link } from "wouter";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { blogData, type BlogPost } from "@/data/blogData";

// Small, file‑scoped UI primitives (kept local to avoid new shared components)
const CategoryBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
    {label}
  </span>
);

const AuthorMeta: React.FC<{ post: BlogPost }> = ({ post }) => (
  <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
    <img
      src={post.author.avatar}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      className="h-8 w-8 rounded-full"
    />
    <span>
      {post.author.name} ·
      <time dateTime={new Date(post.date).toISOString()} className="ml-1">
        {new Date(post.date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
    </span>
  </div>
);

const FeaturedPostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <article className="group overflow-hidden rounded-lg shadow-sm border bg-white">
    <Link
      href={`/blogs/${post.slug}`}
      className="block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    >
      <figure className="relative">
        <img
          src={post.cover.url}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          className="h-[360px] w-full object-cover"
        />
        <figcaption
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
          aria-hidden="true"
        />
      </figure>
      <div className="-mt-20 relative px-6 pb-6">
        <div className="inline-block">
          <CategoryBadge label={post.category} />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
          {post.title}
        </h2>
        <p className="mt-2 max-w-3xl text-white/90">{post.excerpt}</p>
        <AuthorMeta post={post} />
      </div>
    </Link>
  </article>
);

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md">
    <Link
      href={`/blogs/${post.slug}`}
      className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    >
      <img
        src={post.cover.url}
        alt={post.cover.alt}
        width={post.cover.width}
        height={post.cover.height}
        loading="lazy"
        className="h-52 w-full object-cover"
      />
      <div className="p-5">
        <CategoryBadge label={post.category} />
        <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900">{post.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt}</p>
        <AuthorMeta post={post} />
      </div>
    </Link>
  </article>
);

export default function BlogPage() {
  // SEO meta
  useEffect(() => {
    const title = "Blogs | Nairobi DevOps Community";
    const description =
      "Get information on all our upcoming events and past insights from the Nairobi DevOps Community blog.";
    document.title = title;

    const ensure = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    };

    // Standard description
    ensure('meta[name="description"]', { name: "description", content: description });
    // Open Graph
    ensure('meta[property="og:title"]', { property: "og:title", content: title });
    ensure('meta[property="og:description"]', { property: "og:description", content: description });
    ensure('meta[property="og:type"]', { property: "og:type", content: "website" });
    // Twitter
    ensure('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    ensure('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    ensure('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
  }, []);

  const { featured, posts } = blogData;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1" role="main">
        {/* Hero */}
        <header
          className="relative border-b text-white"
          aria-labelledby="blog-page-title"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1600&q=70")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 id="blog-page-title" className="text-4xl font-extrabold tracking-tight">
              Blogs
            </h1>
            <p className="mt-2 text-white/90">
              Get information on all our upcoming events and also past events.
            </p>
          </div>
        </header>

        {/* Featured */}
        <section className="py-10 sm:py-12" aria-labelledby="featured-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="featured-heading" className="mb-4 text-base font-semibold text-slate-700">
              Trending Post
            </h2>
            <FeaturedPostCard post={featured} />
          </div>
        </section>

        {/* Grid */}
        <section className="pb-12 sm:pb-16" aria-labelledby="latest-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="latest-heading" className="mb-6 text-base font-semibold text-slate-700">
              Our Latest Blog Topics
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section
          className="relative py-14 text-white"
          aria-labelledby="cta-title"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=70")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 id="cta-title" className="text-2xl md:text-3xl font-bold">
              Stay ahead in tech trends
            </h2>
            <p className="mt-2 text-white/90">
              Stay ahead of the curve and unlock the future of DevOps by subscribing today.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#newsletter"
                className="inline-flex items-center justify-center rounded bg-primary px-5 py-2.5 font-medium text-white hover:bg-[#023047] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                Subscribe Now
              </a>
              <Link
                href="/community"
                className="inline-flex items-center justify-center rounded bg-white/10 px-5 py-2.5 font-medium text-white backdrop-blur hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                Join the community
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
