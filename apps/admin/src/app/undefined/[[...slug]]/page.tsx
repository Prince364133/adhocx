"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UndefinedRouteFallback() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const slug = params?.slug;
    const target = Array.isArray(slug)
      ? `/${slug.join("/")}`
      : slug
        ? `/${slug}`
        : "/dashboard";
    router.replace(target);
  }, [params, router]);

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "300px" }}
    >
      <p className="text-secondary text-md">Redirecting to page...</p>
    </div>
  );
}
