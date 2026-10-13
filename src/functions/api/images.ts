import {
  isSessionOrKeyAuthorized,
  jsonResponse,
  textResponse,
} from "./_apikey";
import {
  IMAGE_PREFIX,
  createImageId,
  guessImageContentType,
  imageMarkdown,
  imageObjectKey,
  isImageId,
  publicImageUrl,
} from "../_images";
import { loadFeatureFlags } from "../_flags";
import { normalizeSitesHost } from "../_sites";

interface ImagesEnv {
  BUCKET: R2Bucket;
  WEBDAV_USERNAME: string;
  WEBDAV_PASSWORD: string;
  SITES_HOST?: string;
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function sanitizeName(name: string) {
  const cleaned = name.replace(/\\/g, "/").split("/").pop() || "";
  return cleaned.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200);
}

interface ImageRecord {
  id: string;
  name: string;
  size: number;
  uploaded: string;
  contentType: string;
  url: string | null;
  markdown: string;
}

function toRecord(
  object: R2Object,
  sitesHost: string | null,
  origin?: string | null
): ImageRecord | null {
  const id = object.key.slice(IMAGE_PREFIX.length);
  if (!isImageId(id)) return null;
  const meta = object.customMetadata || {};
  const httpMeta = object.httpMetadata || {};
  const name =
    meta.name ||
    httpMeta.contentDisposition?.match(/filename="([^"]+)"/)?.[1] ||
    id;
  const contentType =
    meta.contentType ||
    httpMeta.contentType ||
    "application/octet-stream";
  const uploaded =
    object.uploaded instanceof Date && !Number.isNaN(object.uploaded.getTime())
      ? object.uploaded.toISOString()
      : new Date(0).toISOString();
  let url = publicImageUrl(sitesHost, id);
  if (url && url.startsWith("/i/") && origin) url = origin + url;
  return {
    id,
    name,
    size: Number(object.size) || 0,
    uploaded,
    contentType,
    url,
    markdown: imageMarkdown(url),
  };
}

async function listImages(
  bucket: R2Bucket,
  sitesHost: string | null,
  origin?: string | null
): Promise<ImageRecord[]> {
  const items: ImageRecord[] = [];
  let cursor: string | undefined;
  do {
    const listing = await bucket.list({
      prefix: IMAGE_PREFIX,
      cursor,
    });
    for (const object of listing.objects) {
      try {
        const record = toRecord(object, sitesHost, origin);
        if (record) items.push(record);
      } catch {
        // skip malformed records
      }
    }
    if (!listing.truncated) break;
    cursor = listing.cursor;
  } while (true);
  items.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  return items;
}

export const onRequestGet: PagesFunction<ImagesEnv> = async (context) => {
  const { request, env } = context;
  if (!(await isSessionOrKeyAuthorized(
      request,
      env.BUCKET,
      env.WEBDAV_USERNAME,
      env.WEBDAV_PASSWORD
    ))) {
    return textResponse("Unauthorized", 401);
  }
  const flags = await loadFeatureFlags(env.BUCKET);
  if (!flags.imageHost) {
    return new Response("Not Found", { status: 404 });
  }
  const sitesHost = normalizeSitesHost(env.SITES_HOST) || null;
  const origin = sitesHost === "sites.local" ? new URL(request.url).origin : null;
  const images = await listImages(env.BUCKET, sitesHost, origin);
  return jsonResponse({ sitesHost, images });
};

export const onRequestPost: PagesFunction<ImagesEnv> = async (context) => {
  const { request, env } = context;
  if (!(await isSessionOrKeyAuthorized(
      request,
      env.BUCKET,
      env.WEBDAV_USERNAME,
      env.WEBDAV_PASSWORD
    ))) {
    return textResponse("Unauthorized", 401);
  }
  const flags = await loadFeatureFlags(env.BUCKET);
  if (!flags.imageHost) {
    return new Response("Not Found", { status: 404 });
  }

  const contentTypeHeader = request.headers.get("Content-Type") || "";
  // 前端用 encodeURIComponent 编码中文文件名，这里解码；解码失败时降级为原始值
  const rawName = request.headers.get("X-File-Name") || "";
  let filename = "";
  try {
    filename = sanitizeName(decodeURIComponent(rawName));
  } catch {
    filename = sanitizeName(rawName);
  }
  let bytes: ArrayBuffer;
  let declaredType = contentTypeHeader.split(";")[0].trim();

  if (contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response("缺少 file 字段", { status: 400 });
    }
    filename = sanitizeName(file.name) || filename;
    declaredType = file.type || declaredType;
    bytes = await file.arrayBuffer();
  } else {
    bytes = await request.arrayBuffer();
  }

  if (!bytes || bytes.byteLength === 0) {
    return new Response("空文件", { status: 400 });
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return new Response("图片超过 20MB 上限", { status: 413 });
  }

  const contentType = guessImageContentType(declaredType, filename);
  if (!contentType) {
    return new Response("仅支持图片文件", { status: 400 });
  }

  const id = createImageId();
  const name = filename || `image-${id}`;
  await env.BUCKET.put(imageObjectKey(id), bytes, {
    httpMetadata: { contentType },
    customMetadata: { name, contentType },
  });

  const sitesHost = normalizeSitesHost(env.SITES_HOST) || null;
  let url = publicImageUrl(sitesHost, id);
  // 自托管版：sitesHost 为 sites.local 时用当前请求 origin 拼完整 URL
  if (sitesHost === "sites.local") {
    const origin = new URL(request.url).origin;
    url = `${origin}/i/${id}`;
  }
  return jsonResponse(
    {
      id,
      name,
      size: bytes.byteLength,
      uploaded: new Date().toISOString(),
      contentType,
      url,
      markdown: imageMarkdown(url),
    },
    201
  );
};

export const onRequestDelete: PagesFunction<ImagesEnv> = async (context) => {
  const { request, env } = context;
  if (!(await isSessionOrKeyAuthorized(
      request,
      env.BUCKET,
      env.WEBDAV_USERNAME,
      env.WEBDAV_PASSWORD
    ))) {
    return textResponse("Unauthorized", 401);
  }
  const flags = await loadFeatureFlags(env.BUCKET);
  if (!flags.imageHost) {
    return new Response("Not Found", { status: 404 });
  }

  const id = (new URL(request.url).searchParams.get("id") || "").trim();
  if (!isImageId(id)) {
    return new Response("Bad id", { status: 400 });
  }
  const key = imageObjectKey(id);
  const existing = await env.BUCKET.head(key);
  if (existing === null) {
    return new Response("Not Found", { status: 404 });
  }
  await env.BUCKET.delete(key);
  return jsonResponse({ id, deleted: true });
};
