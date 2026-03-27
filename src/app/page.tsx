import { Sparkles, UserRound } from "lucide-react";
import { CampaignGenerator } from "@/components/campaign-generator";
import { Card } from "@/components/ui/card";

const quickSteps = [
  {
    icon: UserRound,
    title: "Điền thông tin",
    description: "Khách chỉ cần nhập tên, số điện thoại và chọn giới tính.",
  },
  {
    icon: Sparkles,
    title: "Chọn concept và tạo ảnh",
    description:
      "Sau khi hoàn tất bước 1, bước 2 sẽ mở ra để chọn concept, tải ảnh và xem kết quả.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-[#d8b8af] bg-[#f6ebe5]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#9c555b]">
            Hướng dẫn thao tác
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {quickSteps.map(({ icon: Icon, title, description }, index) => (
              <Card
                key={title}
                className="rounded-[24px] border-[#e3c0b5] bg-card p-5 shadow-none"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c555b]">
                      Bước {index + 1}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <CampaignGenerator />
      </section>
    </main>
  );
}
