import { randomInt } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { GENDER_OPTIONS, type CampaignConceptId, type Gender, isCampaignConceptEnabled, isCampaignConceptId } from "@/lib/campaign";
import { waitForRemoteImageAvailability } from "@/lib/remote-image";

const DEFAULT_ENDPOINT = "https://n8n.taskracer.id.vn/webhook/cindy-workflow";
const PUBLIC_SOURCE_ROOT_DIR = path.join(process.cwd(), "public", "source");

type JsonRecord = Record<string, unknown>;

type ResolvedTargetImage = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

type NormalizedGenerateResponse = {
  expiredAt: string | null;
  imageUrl: string | null;
  jobId: string | null;
  message: string | null;
  provider: string | null;
  status: string | null;
  taskId: string | null;
  viewUrl: string | null;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = formData.get("name");
  const phone = formData.get("phone");
  const gender = formData.get("gender");
  const concept = formData.get("concept");
  const photo = formData.get("photo");

  if (typeof name !== "string" || typeof phone !== "string" || typeof gender !== "string" || typeof concept !== "string" || !(photo instanceof File)) {
    return NextResponse.json({ message: "Thiếu dữ liệu bắt buộc để tạo ảnh." }, { status: 400 });
  }

  if (!isGender(gender) || !isCampaignConceptId(concept)) {
    return NextResponse.json({ message: "Concept hoặc giới tính không hợp lệ." }, { status: 400 });
  }

  if (!isCampaignConceptEnabled(concept)) {
    return NextResponse.json({ message: "Concept này đang tạm tắt." }, { status: 400 });
  }

  const endpoint = process.env.IMAGE_GENERATE_ENDPOINT ?? DEFAULT_ENDPOINT;

  try {
    const targetImage = await resolveTargetImage(concept, gender);

    if (!targetImage) {
      return NextResponse.json(
        {
          message: "Tạo ảnh gặp sự cố, vui lòng thử lại.",
        },
        { status: 500 },
      );
    }

    const upstreamFormData = new FormData();
    const targetImageBytes = Uint8Array.from(targetImage.buffer);
    upstreamFormData.set("target_image", new Blob([targetImageBytes], { type: targetImage.mimeType }), targetImage.fileName);
    upstreamFormData.set("source_image", photo, photo.name || "source-image");

    const upstreamResponse = await fetch(endpoint, {
      method: "POST",
      body: upstreamFormData,
      cache: "no-store",
    });

    const contentType = upstreamResponse.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await upstreamResponse.json();
      const normalizedResponse = normalizeGenerateResponse(payload);

      if (normalizedResponse.imageUrl) {
        const isImageReady = await waitForRemoteImageAvailability(normalizedResponse.imageUrl);

        if (!isImageReady) {
          return NextResponse.json(
            {
              message: "Tạo ảnh gặp sự cố, vui lòng thử lại.",
              provider: normalizedResponse.provider,
              status: normalizedResponse.status,
              upstreamStatus: upstreamResponse.status,
            },
            { status: 502 },
          );
        }

        return NextResponse.json(normalizedResponse);
      }

      return NextResponse.json(
        {
          message: normalizedResponse.message ?? "Tạo ảnh gặp sự cố, vui lòng thử lại.",
          provider: normalizedResponse.provider,
          status: normalizedResponse.status,
          upstreamStatus: upstreamResponse.status,
        },
        { status: upstreamResponse.ok ? 502 : upstreamResponse.status },
      );
    }

    if (contentType.startsWith("image/")) {
      const buffer = await upstreamResponse.arrayBuffer();

      return new Response(buffer, {
        status: upstreamResponse.ok ? 200 : upstreamResponse.status,
        headers: {
          "content-type": contentType,
          "cache-control": "no-store",
        },
      });
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          message: "Tạo ảnh gặp sự cố, vui lòng thử lại.",
          upstreamStatus: upstreamResponse.status,
        },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(
      {
        message: "Tạo ảnh gặp sự cố, vui lòng thử lại.",
        responseType: contentType || "unknown",
      },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Tạo ảnh gặp sự cố, vui lòng thử lại.",
      },
      { status: 502 },
    );
  }
}

async function resolveTargetImage(conceptId: CampaignConceptId, gender: Gender): Promise<ResolvedTargetImage | null> {
  const sourceDirectory = path.join(PUBLIC_SOURCE_ROOT_DIR, conceptId, getGenderDirectoryName(gender));
  const files = await readImageFiles(sourceDirectory);

  if (files.length === 0) {
    return null;
  }

  const matchedFile = files[randomInt(files.length)];
  const fullPath = path.join(sourceDirectory, matchedFile);
  const buffer = await readFile(fullPath);

  return {
    buffer,
    fileName: matchedFile,
    mimeType: getMimeType(path.extname(matchedFile)),
  };
}

function getGenderDirectoryName(gender: Gender) {
  return gender === "female" ? "female" : "male";
}

async function readImageFiles(directory: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => isSupportedImageExtension(path.extname(fileName)));
  } catch {
    return [];
  }
}

function normalizeGenerateResponse(payload: unknown): NormalizedGenerateResponse {
  const rootPayload = getPrimaryPayloadRecord(payload);
  const data = asRecord(rootPayload?.data);
  const downloads = readRecordArray(rootPayload?.downloads) ?? readRecordArray(data?.downloads);
  const primaryDownload = downloads?.find((download) => readString(download.url)) ?? null;
  const status = readString(rootPayload?.status) ?? readString(data?.status) ?? null;
  const provider = readString(rootPayload?.provider) ?? readString(data?.provider) ?? null;
  const candidateImageUrl = readString(rootPayload?.imageUrl) ?? readString(rootPayload?.image_url) ?? readString(data?.imageUrl) ?? readString(data?.image_url) ?? readString(rootPayload?.url) ?? readString(data?.url) ?? readString(primaryDownload?.url);
  const expiredAt = readString(primaryDownload?.expires_at) ?? readString(primaryDownload?.expiresAt) ?? readString(rootPayload?.expired_at) ?? readString(rootPayload?.expiredAt) ?? readString(data?.expired_at) ?? readString(data?.expiredAt) ?? null;
  const jobId = readString(rootPayload?.job_id) ?? readString(rootPayload?.jobId) ?? readString(data?.job_id) ?? readString(data?.jobId) ?? null;
  const taskId = readString(rootPayload?.task_id) ?? readString(rootPayload?.taskId) ?? readString(data?._id) ?? readString(data?.task_id) ?? readString(data?.taskId) ?? null;
  const rawMessage = readString(rootPayload?.message) ?? readString(rootPayload?.msg) ?? readString(rootPayload?.error) ?? readString(data?.message) ?? readString(data?.msg) ?? readString(data?.error) ?? null;
  const imageUrl = canUseGeneratedImage(status) ? candidateImageUrl : null;
  const message = normalizeGenerateMessage({
    hasImageUrl: Boolean(imageUrl),
    rawMessage,
    status,
  });

  return {
    imageUrl,
    viewUrl: imageUrl,
    expiredAt,
    message,
    jobId,
    provider,
    status,
    taskId,
  };
}

function canUseGeneratedImage(status: string | null) {
  if (!status) return true;

  return ["success", "complete", "completed"].includes(status.toLowerCase());
}

function normalizeGenerateMessage({ hasImageUrl, rawMessage, status }: { hasImageUrl: boolean; rawMessage: string | null; status: string | null }) {
  if (hasImageUrl && canUseGeneratedImage(status)) {
    return "Hệ thống đã tạo ảnh thành công.";
  }

  return rawMessage;
}

function getMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function isSupportedImageExtension(extension: string) {
  return [".jpg", ".jpeg", ".png", ".webp"].includes(extension.toLowerCase());
}

function isGender(value: string): value is Gender {
  return GENDER_OPTIONS.some((option) => option.value === value);
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function getPrimaryPayloadRecord(value: unknown): JsonRecord | null {
  if (!Array.isArray(value)) {
    return asRecord(value);
  }

  const records = value.map((item) => asRecord(item)).filter((item): item is JsonRecord => item !== null);

  if (records.length === 0) {
    return null;
  }

  return (
    records.find((record) => {
      const data = asRecord(record.data);

      return Boolean(readString(record.url) ?? readString(record.imageUrl) ?? readString(record.image_url) ?? readString(record.job_id) ?? readString(record.task_id) ?? readString(record.status) ?? readString(data?.url) ?? readString(data?.imageUrl) ?? readString(data?.image_url));
    }) ?? records[0]
  );
}

function readRecordArray(value: unknown) {
  if (!Array.isArray(value)) return null;

  const records = value.map((item) => asRecord(item)).filter((item): item is JsonRecord => item !== null);

  return records.length > 0 ? records : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
