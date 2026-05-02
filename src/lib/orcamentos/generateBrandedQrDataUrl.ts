/**
 * Gera QR Code com a logo da GetBrain centralizada.
 *
 * Estratégia:
 *  1. Geramos o QR com `errorCorrectionLevel: "H"` (~30% de redundância),
 *     o que permite obstruir o centro com a logo sem quebrar a leitura.
 *  2. Desenhamos o QR num canvas off-screen em alta resolução (480px) pra
 *     ficar nítido em telas com devicePixelRatio alto e quando o cliente
 *     tirar print.
 *  3. Pintamos um quadrado branco arredondado por trás da logo, dando
 *     respiro visual e separação do padrão do QR.
 *  4. Sobrepomos a logo (~18% do tamanho do QR).
 *
 * Em qualquer falha, cai pro QR puro via `generateQrDataUrl`.
 */
import QRCode from "qrcode";
import { generateQrDataUrl } from "./generateQrDataUrl";
import logoGetBrain from "@/assets/logo-getbrain-oficial.svg";

const QR_SIZE = 480;
const LOGO_RATIO = 0.18; // fração do tamanho do QR
const PADDING_RATIO = 0.22; // quadrado branco atrás da logo
const RADIUS_RATIO = 0.18; // raio dos cantos do quadrado branco

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  // decode() rejeita se a imagem falhar — capturado pelo caller.
  await img.decode();
  return img;
}

export async function generateBrandedQrDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // 1. Gera QR puro em alta resolução com correção de erro alta
    const baseDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: QR_SIZE,
      color: { dark: "#0a0e1a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    // 2. Carrega QR + logo em paralelo
    const [qrImg, logoImg] = await Promise.all([
      loadImage(baseDataUrl),
      loadImage(logoGetBrain),
    ]);

    // 3. Compõe no canvas
    const canvas = document.createElement("canvas");
    canvas.width = QR_SIZE;
    canvas.height = QR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return baseDataUrl;

    ctx.drawImage(qrImg, 0, 0, QR_SIZE, QR_SIZE);

    // 4. Quadrado branco com cantos arredondados atrás da logo
    const padSize = QR_SIZE * PADDING_RATIO;
    const padX = (QR_SIZE - padSize) / 2;
    const padY = (QR_SIZE - padSize) / 2;
    const radius = padSize * RADIUS_RATIO;

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, padX, padY, padSize, padSize, radius);
    ctx.fill();

    // borda sutil pra separar do padrão do QR
    ctx.strokeStyle = "rgba(10, 14, 26, 0.08)";
    ctx.lineWidth = 1;
    roundedRect(ctx, padX + 0.5, padY + 0.5, padSize - 1, padSize - 1, radius);
    ctx.stroke();

    // 5. Logo centralizada
    const logoSize = QR_SIZE * LOGO_RATIO;
    const logoX = (QR_SIZE - logoSize) / 2;
    const logoY = (QR_SIZE - logoSize) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

    return canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("[generateBrandedQrDataUrl] falha — caindo pro QR puro", e);
    return generateQrDataUrl(url);
  }
}
