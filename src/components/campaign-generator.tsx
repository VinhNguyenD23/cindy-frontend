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
  src: string;
  revocable: boolean;
  source: "api";
  viewUrl?: string;
  expiredAt?: string | null;
};

type GeneratePayload = {
  provider?: string;
  imageUrl?: string;
  viewUrl?: string;
  expiredAt?: string | null;
  message?: string;
  status?: string;
};

const GENERATE_ERROR_MESSAGE = "Tạo ảnh gặp sự cố, vui lòng thử lại.";

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
      if (!form.photo) throw new Error("Ảnh tải lên không hợp lệ.");
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
        if (data.imageUrl) {
          const remoteImageUrl = data.viewUrl ?? data.imageUrl;
          updateGeneratedAsset({
            src: remoteImageUrl,
            revocable: false,
            source: "api",
            viewUrl: remoteImageUrl,
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
    <div
      className={cn(
        "grid gap-6",
        isStepTwoUnlocked ? "lg:grid-cols-[1.05fr_0.95fr]" : "mx-auto max-w-4xl",
      )}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-[#fff5f0] p-6 sm:p-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-[14px] border border-[#ebc7bc] bg-white px-4 py-2 text-sm font-semibold text-[#7f1a21]">
            <Sparkles className="h-4 w-4" />
            Trình tạo ảnh cá nhân hoá
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18 text-xs">
                1
              </span>
              Điền thông tin
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                isStepTwoUnlocked
                  ? "bg-primary text-primary-foreground"
                  : "border border-[#e7c8bc] bg-white text-[#9c555b]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isStepTwoUnlocked ? "bg-white/18" : "bg-[#fff1ea]",
                )}
              >
                2
              </span>
              Chọn concept và tạo ảnh
            </div>
          </div>
          <CardTitle className="mt-5 text-3xl font-extrabold tracking-[-0.03em]">
            Hoàn tất từng bước để mở phần tạo ảnh
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
            Ở bước đầu, người dùng chỉ cần điền thông tin cơ bản. Sau đó bước 2
            sẽ mở ra và cột kết quả bên phải mới xuất hiện.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {!isStepTwoUnlocked ? (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary text-primary-foreground">
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
                              ? "border-primary bg-[#fff0ea] text-[#7f1a21]"
                              : "border-border bg-white text-foreground hover:bg-[#fff4ef]",
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
                  <p className="rounded-[16px] border border-[#e5b4b4] bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#8d2027]">
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.02em]">
                      2. Chọn concept và tạo ảnh
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Bước 2 đã mở. Chọn concept, tải ảnh và bắt đầu tạo ảnh.
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
                            "relative flex flex-col items-center rounded-[28px] border border-transparent px-3 py-2 text-center transition-transform transition-colors",
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-[#fff0ea] shadow-[0_12px_24px_rgba(164,18,31,0.08)]"
                              : "bg-transparent hover:bg-[#fff4ef]",
                          )}
                        >
                          {isDisabled ? (
                            <span className="absolute top-2 right-2 rounded-full border border-[#e5c3b8] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c555b]">
                              Tạm tắt
                            </span>
                          ) : null}
                          <div
                            className={cn(
                              "relative h-36 w-36 overflow-hidden rounded-full border-4 bg-[#f3e4dd]",
                              isSelected
                                ? "border-primary"
                                : "border-[#ead1c8]",
                            )}
                          >
                            <Image
                              src={concept.image}
                              alt={`Concept ${concept.label}`}
                              fill
                              sizes="144px"
                              className="object-cover"
                            />
                          </div>
                          <h3
                            className={cn(
                              "mt-4 text-2xl font-extrabold tracking-[-0.03em]",
                              isSelected ? "text-primary" : "text-foreground",
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
                      Tải ảnh chân dung
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Nên chọn ảnh sáng, rõ mặt để kết quả demo thuyết phục hơn.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <label
                      htmlFor="customer-photo"
                      className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#d8b6ac] bg-[#fff7f3] p-6 text-center transition-colors hover:bg-[#fff2ec]"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground">
                        <ImageUp className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-lg font-bold">
                        Chạm để tải ảnh từ điện thoại hoặc máy tính
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Hỗ trợ JPG, PNG, WEBP. Hệ thống sẽ dùng ảnh này để tạo
                        visual cho concept đã chọn.
                      </p>
                      <span className="mt-4 rounded-[14px] border border-[#e4bfb3] bg-white px-4 py-2 text-sm font-semibold text-[#7f1a21]">
                        Chọn ảnh
                      </span>
                    </label>
                    <input
                      id="customer-photo"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />

                    <div className="rounded-[28px] border border-border bg-[#fffaf7] p-4">
                      <p className="text-sm font-semibold text-[#7f1a21]">
                        Xem trước ảnh tải lên
                      </p>
                      <div className="mt-3 overflow-hidden rounded-[22px] border border-[#ead3cb] bg-[#f0dfd7]">
                        {previewUrl ? (
                          <div className="relative aspect-[4/5] w-full">
                            <Image
                              src={previewUrl}
                              alt="Ảnh khách đã tải lên"
                              fill
                              unoptimized
                              sizes="(min-width: 1024px) 24rem, 100vw"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-sm leading-6 text-muted-foreground">
                            Ảnh tải lên sẽ xuất hiện ở đây.
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {form.photo
                          ? `Đã chọn: ${form.photo.name}`
                          : "Chưa có ảnh nào được tải lên."}
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
                        Đang tạo ảnh...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Tạo ảnh ngay
                      </>
                    )}
                  </Button>
                  {error ? (
                    <p className="rounded-[16px] border border-[#e5b4b4] bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#8d2027]">
                      {error}
                    </p>
                  ) : null}
                </section>
              </section>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {isStepTwoUnlocked ? (
        <div className="self-start lg:sticky lg:top-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-[#f7ebe5] p-6">
              <CardTitle className="text-2xl font-extrabold tracking-[-0.03em]">
                Khu vực kết quả
              </CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                Kết quả sẽ hiện ở đây ngay sau khi xử lý xong.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-[26px] border border-[#e4c2b7] bg-[#fff4ee] p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-24 overflow-hidden rounded-[16px] border border-[#e7c6bb] bg-[#f0dfd7]">
                    <Image
                      src={selectedConcept.image}
                      alt={`Minh hoạ concept ${selectedConcept.label}`}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c555b]">
                      Concept đã chọn
                    </p>
                    <h3 className="mt-1 text-lg font-bold">
                      {selectedConcept.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {selectedConcept.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-[#e2c0b5] bg-[#f1ddd5]">
                {generatedAsset ? (
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src={generatedAsset.src}
                      alt={`Kết quả ảnh cho concept ${selectedConcept.label}`}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 28rem, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 p-8 text-center">
                    {isGenerating ? (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-primary-foreground">
                          <LoaderCircle className="h-8 w-8 animate-spin" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">
                            Hệ thống đang xử lý ảnh
                          </p>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            Trang sẽ giữ người dùng ở đúng màn hình này cho đến
                            khi ảnh sẵn sàng.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-primary shadow-sm">
                          <Sparkles className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">
                            Chưa có ảnh được tạo
                          </p>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            Sau khi bấm nút tạo ảnh, kết quả sẽ hiển thị ở đây
                            để khách xem ngay.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {generatedAsset?.expiredAt ? (
                <div className="rounded-[20px] border border-[#e4c2b7] bg-[#fffaf7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c555b]">
                    Expired At
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatExpiration(generatedAsset.expiredAt)}
                  </p>
                </div>
              ) : null}

              {note ? (
                <p
                  className={cn(
                    "rounded-[16px] border border-[#cbd9c4] bg-[#f3f8ef] px-4 py-3 text-sm font-medium text-[#426033]",
                  )}
                >
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
            </CardContent>
          </Card>
        </div>
      ) : null}
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
  if (!form.photo) return "Vui lòng tải ảnh của khách trước khi tạo ảnh.";
  return null;
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
  return "Đã gen hình ảnh thành công.";
}

function getDownloadFileName(
  customerName: string,
  conceptId: CampaignConceptId,
  generatedAsset: GeneratedAsset,
) {
  const baseName = `chinsu-${slugify(customerName) || "khach-hang"}-${conceptId}`;

  if (generatedAsset.src.startsWith("blob:") || generatedAsset.src.startsWith("data:")) {
    return `${baseName}.png`;
  }

  try {
    const pathname = new URL(generatedAsset.viewUrl ?? generatedAsset.src).pathname;
    const extension = pathExtensionOrDefault(pathname);
    return `${baseName}${extension}`;
  } catch {
    return `${baseName}.png`;
  }
}

function pathExtensionOrDefault(pathname: string) {
  const lastSegment = pathname.split("/").pop() ?? "";
  const matchedExtension = /\.([a-zA-Z0-9]+)$/.exec(lastSegment);
  return matchedExtension ? `.${matchedExtension[1].toLowerCase()}` : ".png";
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}
