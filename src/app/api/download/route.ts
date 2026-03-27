import path from "node:path";
import { NextResponse } from "next/server";
import { fetchRemoteImageWithRetry } from "@/lib/remote-image";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const requestedFileName = searchParams.get("filename");

  if (!targetUrl || !isHttpUrl(targetUrl)) {
    return NextResponse.json(
      { message: "Thiếu URL hợp lệ để tải video." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetchRemoteImageWithRetry(targetUrl);

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return NextResponse.json(
        { message: "Không thể tải video từ URL đã cung cấp." },
        { status: upstreamResponse.status || 502 },
      );
    }

    const contentType =
      upstreamResponse.headers.get("content-type") ?? "application/octet-stream";
    const fileName = buildDownloadFileName(
      requestedFileName,
      targetUrl,
      contentType,
    );

    return new Response(upstreamResponse.body, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${fileName}"`,
        "content-type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Không thể kết nối tới URL tải video." },
      { status: 502 },
    );
  }
}

function isHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function buildDownloadFileName(
  requestedFileName: string | null,
  targetUrl: string,
  contentType: string,
) {
  const normalizedRequestedName = sanitizeFileName(requestedFileName);
  const requestedExtension = normalizedRequestedName
    ? path.extname(normalizedRequestedName)
    : "";

  if (normalizedRequestedName && requestedExtension) {
    return normalizedRequestedName;
  }

  const urlExtension = path.extname(new URL(targetUrl).pathname);
  const defaultExtension = getExtensionFromContentType(contentType);
  const extension = requestedExtension || urlExtension || defaultExtension;
  const baseName =
    normalizedRequestedName?.replace(/\.[^.]+$/, "") || "generated-image";

  return `${baseName}${extension}`;
}

function sanitizeFileName(value: string | null) {
  if (!value) return null;
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
}

function getExtensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return "";
}
