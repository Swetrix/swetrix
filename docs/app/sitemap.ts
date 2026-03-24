import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const BASE_URL = "https://swetrix.com/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    changeFrequency: "weekly",
  }));
}
