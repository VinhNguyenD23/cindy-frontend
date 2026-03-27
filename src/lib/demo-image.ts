import {
  getConceptById,
  type CampaignConceptId,
  type Gender,
} from "@/lib/campaign";

type ComposeOptions = {
  conceptId: CampaignConceptId;
  customerName: string;
  customerPhone: string;
  gender: Gender;
  photoFile: File;
};

export async function composeDemoCampaignImage({
  conceptId,
  customerName,
  customerPhone,
  gender,
  photoFile,
}: ComposeOptions) {
  const concept = getConceptById(conceptId);

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Thiết bị không hỗ trợ dựng video xem thử.");
  }

  const photoUrl = URL.createObjectURL(photoFile);

  try {
    const [portrait, conceptImage] = await Promise.all([
      loadImage(photoUrl),
      loadImage(concept.image),
    ]);

    context.fillStyle = concept.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = concept.accentColor;
    context.fillRect(0, 0, canvas.width, 230);

    fillRoundedRect(context, 70, 60, 230, 56, 18, "#FFFDF6");
    context.fillStyle = concept.accentColor;
    context.font = "700 28px 'Be Vietnam Pro', sans-serif";
    context.fillText("CHIN-SU IMAGE LAB", 96, 96);

    context.fillStyle = "#FFFDF6";
    context.font = "800 78px 'Be Vietnam Pro', sans-serif";
    context.fillText(concept.posterTitle, 70, 170);

    context.fillStyle = "#FFF0C9";
    context.font = "500 30px 'Be Vietnam Pro', sans-serif";
    context.fillText(
      "Ban xem thu tao anh chien dich ca nhan hoa",
      72,
      208,
    );

    drawCoverImage(context, portrait, 70, 278, 548, 788, 34);
    drawCoverImage(context, conceptImage, 664, 278, 346, 286, 30);

    fillRoundedRect(context, 664, 594, 346, 472, 30, "#FFFDF6");
    context.fillStyle = concept.accentColor;
    context.font = "800 46px 'Be Vietnam Pro', sans-serif";
    context.fillText(
      truncateText(context, customerName || "Khach moi", 292),
      694,
      674,
    );

    context.fillStyle = "#75552B";
    context.font = "600 28px 'Be Vietnam Pro', sans-serif";
    context.fillText(getGenderMessage(gender), 694, 722);

    context.fillStyle = "#AA7A28";
    context.font = "500 24px 'Be Vietnam Pro', sans-serif";
    context.fillText("Concept da chon", 694, 792);

    context.fillStyle = "#342417";
    context.font = "700 34px 'Be Vietnam Pro', sans-serif";
    context.fillText(concept.label, 694, 838);

    context.fillStyle = "#89693B";
    context.font = "500 24px 'Be Vietnam Pro', sans-serif";
    wrapText(
      context,
      getConceptMessage(conceptId),
      694,
      886,
      280,
      36,
    );

    fillRoundedRect(
      context,
      694,
      970,
      286,
      70,
      20,
      concept.panelColor,
    );
    context.fillStyle = concept.accentColor;
    context.font = "700 30px 'Be Vietnam Pro', sans-serif";
    context.fillText("SAN SANG DE TAI VE", 730, 1014);

    context.fillStyle = concept.accentColor;
    context.fillRect(0, 1155, canvas.width, 195);

    context.fillStyle = "#FFFDF6";
    context.font = "800 56px 'Be Vietnam Pro', sans-serif";
    context.fillText("Trang demo Chin-su", 70, 1240);

    context.fillStyle = "#F9E7B2";
    context.font = "500 28px 'Be Vietnam Pro', sans-serif";
    context.fillText(
      "Anh nay dang duoc tao tu local fallback, san sang thay bang API that sau.",
      70,
      1288,
    );

    context.fillText(
      customerPhone ? `Lien he: ${customerPhone}` : "Lien he: se cap nhat",
      70,
      1326,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        reject(new Error("Không thể xuất video xem thử."));
      }, "image/png");
    });

    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(photoUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không tải được video minh hoạ."));
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();

  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
) {
  context.save();
  context.fillStyle = fillStyle;
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
  context.restore();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lineIndex = 0;

  for (const word of words) {
    const trial = `${line}${word} `;
    const width = context.measureText(trial).width;

    if (width > maxWidth && line) {
      context.fillText(line.trim(), x, y + lineIndex * lineHeight);
      line = `${word} `;
      lineIndex += 1;
      continue;
    }

    line = trial;
  }

  if (line) {
    context.fillText(line.trim(), x, y + lineIndex * lineHeight);
  }
}

function truncateText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let current = text;

  while (current.length > 0 && context.measureText(`${current}...`).width > maxWidth) {
    current = current.slice(0, -1);
  }

  return `${current}...`;
}

function getGenderMessage(gender: Gender) {
  switch (gender) {
    case "female":
      return "Than thai noi bat, sac net tren moi visual.";
    case "male":
    default:
      return "Phong thai ban linh, hop chat chien dich do.";
  }
}

function getConceptMessage(conceptId: CampaignConceptId) {
  switch (conceptId) {
    case "rooftop":
      return "Nang luong tuoi moi, hinh anh bat mat va than thai tre trung la tam diem.";
    case "home-kitchen":
      return "Tong the mem mai, cuon hut va goi cam giac quyen ru day bi an.";
    case "bar":
    default:
      return "Visual thanh lich, sang trong va ton len than thai quy phai cho nhan vat.";
  }
}
