"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Download,
  Facebook,
  ImageUp,
  LoaderCircle,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  CAMPAIGN_CONCEPTS,
  DEFAULT_CAMPAIGN_CONCEPT_ID,
  GENDER_OPTIONS,
  type CampaignConceptId,
  type Gender,
  getConceptById,
} from "@/lib/campaign";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  name: string;
  phone: string;
  gender: Gender;
  concept: CampaignConceptId;
  photo: File | null;
};

type GeneratedAsset = {
  kind: "image" | "video";
  src: string;
  revocable: boolean;
  source: "api";
  viewUrl?: string;
  expiredAt?: string | null;
};

type GeneratePayload = {
  provider?: string;
  imageUrl?: string;
  mediaType?: "image" | "video";
  url?: string;
  viewUrl?: string;
  expiredAt?: string | null;
  message?: string;
  status?: string;
};

const GENERATE_ERROR_MESSAGE = "Tạo video gặp sự cố, vui lòng thử lại.";

const initialFormState: FormState = {
  name: "",
  phone: "",
  gender: "male",
  concept: DEFAULT_CAMPAIGN_CONCEPT_ID,
  photo: null,
};

export function CampaignGenerator() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(
    null,
  );
  const [isStepTwoUnlocked, setIsStepTwoUnlocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const generatedAssetRef = useRef<string | null>(null);
  const stepTwoRef = useRef<HTMLElement | null>(null);
  const selectedConcept = getConceptById(form.concept);
  const isStepOneComplete = !validateStepOne(form);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (generatedAssetRef.current)
        URL.revokeObjectURL(generatedAssetRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isStepTwoUnlocked || !stepTwoRef.current) return;
    stepTwoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isStepTwoUnlocked]);

  function updatePreview(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (!file) return setPreviewUrl(null);
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  }

  function updateGeneratedAsset(nextAsset: GeneratedAsset | null) {
    if (generatedAssetRef.current) {
      URL.revokeObjectURL(generatedAssetRef.current);
      generatedAssetRef.current = null;
    }
    if (nextAsset?.revocable) generatedAssetRef.current = nextAsset.src;
    setGeneratedAsset(nextAsset);
  }

  function resetResult() {
    updateGeneratedAsset(null);
    setNote(null);
    setError(null);
  }

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    resetResult();
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    updateField("photo", file);
    updatePreview(file);
  }

  function handleContinueToStepTwo() {
    const validationError = validateStepOne(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsStepTwoUnlocked(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm(form);
    if (validationError) return setError(validationError);

    setIsGenerating(true);
    setError(null);
    setNote(null);

    try {
      const payload = new FormData();
      payload.set("name", form.name.trim());
      payload.set("phone", form.phone.trim());
      payload.set("gender", form.gender);
      payload.set("concept", form.concept);
      if (!form.photo) throw new Error("Video tải lên không hợp lệ.");
      payload.set("photo", form.photo);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: payload,
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = (await response.json()) as GeneratePayload;
        if (!response.ok) {
          throw new Error(data.message ?? GENERATE_ERROR_MESSAGE);
        }
        const remoteAssetUrl = data.url ?? data.viewUrl ?? data.imageUrl;
        if (remoteAssetUrl) {
          updateGeneratedAsset({
            kind: getGeneratedAssetKind(remoteAssetUrl, data.mediaType),
            src: remoteAssetUrl,
            revocable: false,
            source: "api",
            viewUrl: remoteAssetUrl,
            expiredAt: data.expiredAt ?? null,
          });
          setNote(getGeneratedSuccessNote());
          return;
        }
        throw new Error(data.message ?? GENERATE_ERROR_MESSAGE);
      }

      if (!response.ok) throw new Error(GENERATE_ERROR_MESSAGE);
      const blob = await response.blob();
      updateGeneratedAsset({
        kind: blob.type.startsWith("video/") ? "video" : "image",
        src: URL.createObjectURL(blob),
        revocable: true,
        source: "api",
      });
      setNote(getGeneratedSuccessNote());
    } catch (submitError) {
      const nextMessage =
        submitError instanceof Error
          ? submitError.message || GENERATE_ERROR_MESSAGE
          : GENERATE_ERROR_MESSAGE;
      updateGeneratedAsset(null);
      setNote(null);
      setError(nextMessage);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (!generatedAsset) return;
    const fileName = getDownloadFileName(form.name, form.concept, generatedAsset);

    if (
      generatedAsset.src.startsWith("blob:") ||
      generatedAsset.src.startsWith("data:")
    ) {
      return triggerDownload(generatedAsset.src, fileName);
    }

    const downloadUrl = new URL("/api/download", window.location.origin);
    downloadUrl.searchParams.set(
      "url",
      generatedAsset.viewUrl ?? generatedAsset.src,
    );
    downloadUrl.searchParams.set("filename", fileName);
    triggerDownload(downloadUrl.toString(), fileName);
  }

  return (
    <div className="mx-auto w-full max-w-[82rem]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-[linear-gradient(180deg,_#fffaf0_0%,_#f8efd9_100%)] p-6 sm:p-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-[14px] border border-[#ead7ac] bg-white px-4 py-2 text-sm font-semibold text-[#a77725]">
            <Sparkles className="h-4 w-4" />
            Trình tạo video cá nhân hoá
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e4aa18] px-4 py-2 text-sm font-semibold text-[#fffdf7]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18 text-xs">
                1
              </span>
              Điền thông tin
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                isStepTwoUnlocked
                  ? "bg-[#e4aa18] text-[#fffdf7]"
                  : "border border-[#e7d7b4] bg-white text-[#a77725]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isStepTwoUnlocked ? "bg-white/18" : "bg-[#fff7df]",
                )}
              >
                2
              </span>
              Chọn concept và tạo video
            </div>
          </div>
          <CardTitle className="mt-5 text-3xl font-extrabold tracking-[-0.03em]">
            Hoàn tất từng bước để mở phần tạo video
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
            Ở bước đầu, người dùng chỉ cần điền thông tin cơ bản. Sau đó bước 2
            sẽ mở ra và khu vực kết quả sẽ xuất hiện ngay bên dưới.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {!isStepTwoUnlocked ? (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#e4aa18] text-[#fffdf7]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.02em]">
                      1. Thông tin khách hàng
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tối giản biểu mẫu để khách điền nhanh.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Họ và tên</Label>
                    <Input
                      id="customer-name"
                      autoComplete="name"
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Số điện thoại</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="customer-phone"
                        autoComplete="tel"
                        inputMode="tel"
                        className="pl-11"
                        placeholder="Ví dụ: 0901 234 567"
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Giới tính</Label>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup">
                    {GENDER_OPTIONS.map((option) => {
                      const isSelected = form.gender === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateField("gender", option.value)}
                          className={cn(
                            "flex h-14 items-center justify-between rounded-[18px] border px-4 text-sm font-semibold transition-colors",
                            isSelected
                              ? "border-[#e4aa18] bg-[#fff5dc] text-[#a77725]"
                              : "border-border bg-white text-foreground hover:bg-[#fff8e8]",
                          )}
                        >
                          <span>{option.label}</span>
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="min-w-[180px]"
                    onClick={handleContinueToStepTwo}
                    disabled={!isStepOneComplete}
                  >
                    Tiếp tục
                  </Button>
                </div>

                {error ? (
                  <p className="rounded-[16px] border border-[#e7c7aa] bg-[#fff7e6] px-4 py-3 text-sm font-medium text-[#8a5a16]">
                    {error}
                  </p>
                ) : null}
              </section>
            ) : null}

            {isStepTwoUnlocked ? (
              <section
                ref={stepTwoRef}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#e4aa18] text-[#fffdf7]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.02em]">
                      2. Chọn concept và tạo video
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Bước 2 đã mở. Chọn concept, tải video và bắt đầu tạo video.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Chọn concept
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Chạm vào concept để đổi bối cảnh minh hoạ.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    {CAMPAIGN_CONCEPTS.map((concept) => {
                      const isSelected = form.concept === concept.id;
                      const isDisabled = !concept.enabled;
                      return (
                        <button
                          key={concept.id}
                          type="button"
                          onClick={() => {
                            if (!isDisabled) updateField("concept", concept.id);
                          }}
                          disabled={isDisabled}
                          aria-disabled={isDisabled}
                          className={cn(
                            "relative flex flex-col items-center rounded-[28px] border border-transparent px-3 py-3 text-center transition-transform transition-colors",
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-[#fff5dc] shadow-[0_12px_24px_rgba(196,145,24,0.14)]"
                              : "bg-transparent hover:bg-[#fff8e8]",
                          )}
                        >
                          {isDisabled ? (
                            <span className="absolute top-2 right-2 rounded-full border border-[#e7d1a6] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a77725]">
                              Tạm tắt
                            </span>
                          ) : null}
                          <div
                            className={cn(
                              "relative h-36 w-36 overflow-hidden rounded-full border-4 bg-[#f7edd1]",
                              isSelected
                                ? "border-[#e4aa18]"
                                : "border-[#ead8ab]",
                            )}
                          >
                            <Image
                              src={concept.image}
                              alt={`Concept ${concept.label}`}
                              fill
                              sizes="144px"
                              className="object-cover saturate-[0.82] hue-rotate-[6deg]"
                            />
                          </div>
                          <h3
                            className={cn(
                              "mt-4 text-lg font-extrabold tracking-[-0.03em] sm:text-xl",
                              isSelected ? "text-[#c08d12]" : "text-foreground",
                            )}
                          >
                            {concept.label}
                          </h3>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Tải video chân dung
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Có thể dùng video hoặc file rõ mặt để hệ thống xem trước nội dung tải lên.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <label
                      htmlFor="customer-photo"
                      className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#e2cd98] bg-[#fffaf0] p-6 text-center transition-colors hover:bg-[#fff3d6]"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#e4aa18] text-[#fffdf7]">
                        <ImageUp className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-lg font-bold">
                        Chạm để tải video từ điện thoại hoặc máy tính
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Hỗ trợ MP4, MOV, WEBM và cả JPG, PNG, WEBP khi cần. Hệ
                        thống sẽ dùng tệp này cho bước xử lý tiếp theo.
                      </p>
                      <span className="mt-4 rounded-[14px] border border-[#e4cf9c] bg-white px-4 py-2 text-sm font-semibold text-[#a77725]">
                        Chọn video
                      </span>
                    </label>
                    <input
                      id="customer-photo"
                      type="file"
                      accept="image/*,video/*"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />

                    <div className="rounded-[28px] border border-border bg-[#fffcf4] p-4">
                      <p className="text-sm font-semibold text-[#a77725]">
                        Xem trước video tải lên
                      </p>
                      <div className="mt-3 overflow-hidden rounded-[22px] border border-[#eadcb8] bg-[#f6ecd1]">
                        {previewUrl ? (
                          isVideoFile(form.photo) ? (
                            <video
                              src={previewUrl}
                              controls
                              playsInline
                              className="aspect-[4/5] w-full bg-[#f6ecd1] object-contain"
                            />
                          ) : (
                            <div className="relative aspect-[4/5] w-full">
                              <Image
                                src={previewUrl}
                                alt="Video khách đã tải lên"
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 24rem, 100vw"
                                className="object-contain"
                              />
                            </div>
                          )
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-sm leading-6 text-muted-foreground">
                            Video tải lên sẽ xuất hiện ở đây.
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {form.photo
                          ? `Đã chọn: ${form.photo.name}`
                          : "Chưa có video nào được tải lên."}
                      </p>
                    </div>
                  </div>
                </div>

                <section className="space-y-4">
                  <Button
                    type="submit"
                    className="h-16 w-full rounded-[20px] text-base"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Đang tạo video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Tạo video ngay
                      </>
                    )}
                  </Button>
                  {error ? (
                    <p className="rounded-[16px] border border-[#e7c7aa] bg-[#fff7e6] px-4 py-3 text-sm font-medium text-[#8a5a16]">
                      {error}
                    </p>
                  ) : null}
                </section>
              </section>
            ) : null}
          </form>

          {isStepTwoUnlocked ? (
            <section className="mt-8 border-t border-border pt-8">
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
                  Khu vực kết quả
                </h2>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Kết quả sẽ hiện ở đây ngay sau khi xử lý xong.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-[26px] border border-[#e7d5aa] bg-[#fff8e8] p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-20 w-24 overflow-hidden rounded-[16px] border border-[#ead7ad] bg-[#f6ecd1]">
                      <Image
                        src={selectedConcept.image}
                        alt={`Minh hoạ concept ${selectedConcept.label}`}
                        fill
                        sizes="96px"
                        className="object-cover saturate-[0.82] hue-rotate-[6deg]"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a77725]">
                        Concept đã chọn
                      </p>
                      <h3 className="mt-1 text-lg font-bold">
                        {selectedConcept.label}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-[#e6d4aa] bg-[#f5e8c7]">
                  {generatedAsset ? (
                    <div className="relative aspect-[4/5] w-full">
                      {generatedAsset.kind === "video" ? (
                        <video
                          src={generatedAsset.src}
                          controls
                          playsInline
                          className="h-full w-full bg-[#f5e8c7] object-contain"
                        />
                      ) : (
                        <Image
                          src={generatedAsset.src}
                          alt={`Kết quả video cho concept ${selectedConcept.label}`}
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 72rem, 100vw"
                          className="object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 p-8 text-center">
                      {isGenerating ? (
                        <>
                          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e4aa18] text-[#fffdf7]">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                          </div>
                          <div>
                            <p className="text-lg font-bold">
                              Hệ thống đang xử lý video
                            </p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                              Trang sẽ giữ người dùng ở đúng màn hình này cho đến
                              khi video sẵn sàng.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-[#c08d12] shadow-sm">
                            <Sparkles className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-lg font-bold">
                              Chưa có video được tạo
                            </p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                              Sau khi bấm nút tạo video, kết quả sẽ hiển thị ở đây
                              để khách xem ngay.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {generatedAsset?.expiredAt ? (
                  <div className="rounded-[20px] border border-[#e7d5aa] bg-[#fffcf4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a77725]">
                      Expired At
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatExpiration(generatedAsset.expiredAt)}
                    </p>
                  </div>
                ) : null}

                {note ? (
                  <p className="rounded-[16px] border border-[#d9c594] bg-[#fff7df] px-4 py-3 text-sm font-medium text-[#7b5a1d]">
                    {note}
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={!generatedAsset}
                    onClick={handleDownload}
                  >
                    <Download className="h-5 w-5" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled
                  >
                    <Facebook className="h-5 w-5" />
                    Share on Facebook
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function validateStepOne(form: FormState) {
  if (!form.name.trim()) return "Vui lòng nhập họ và tên khách hàng.";
  if (!form.phone.trim()) return "Vui lòng nhập số điện thoại.";
  if (!/^[0-9+()\s.-]{8,}$/.test(form.phone.trim())) {
    return "Số điện thoại chưa đúng định dạng.";
  }
  return null;
}

function validateForm(form: FormState) {
  const stepOneError = validateStepOne(form);
  if (stepOneError) return stepOneError;
  if (!form.photo) return "Vui lòng tải video của khách trước khi tạo video.";
  return null;
}

function isVideoFile(file: File | null) {
  return Boolean(file?.type?.startsWith("video/"));
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function formatExpiration(value?: string | null) {
  if (!value) return "Chưa có thông tin hết hạn.";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getGeneratedSuccessNote() {
  return "Đã tạo video thành công.";
}

function getDownloadFileName(
  customerName: string,
  conceptId: CampaignConceptId,
  generatedAsset: GeneratedAsset,
) {
  const baseName = `cindy-${slugify(customerName) || "khach-hang"}-${conceptId}`;

  if (generatedAsset.src.startsWith("blob:") || generatedAsset.src.startsWith("data:")) {
    return `${baseName}${generatedAsset.kind === "video" ? ".mp4" : ".png"}`;
  }

  try {
    const pathname = new URL(generatedAsset.viewUrl ?? generatedAsset.src).pathname;
    const extension = pathExtensionOrDefault(pathname);
    return `${baseName}${extension}`;
  } catch {
    return `${baseName}${generatedAsset.kind === "video" ? ".mp4" : ".png"}`;
  }
}

function pathExtensionOrDefault(pathname: string) {
  const lastSegment = pathname.split("/").pop() ?? "";
  const matchedExtension = /\.([a-zA-Z0-9]+)$/.exec(lastSegment);
  return matchedExtension ? `.${matchedExtension[1].toLowerCase()}` : ".png";
}

function getGeneratedAssetKind(
  assetUrl: string,
  mediaType?: "image" | "video",
) {
  if (mediaType) return mediaType;

  try {
    const pathname = new URL(assetUrl).pathname.toLowerCase();
    if ([".mp4", ".mov", ".webm", ".m4v", ".avi"].some((extension) => pathname.endsWith(extension))) {
      return "video";
    }
  } catch {}

  return "image";
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}
