/**
 * Gera QR code como data URL PNG. Usado pra embutir o link público
 * da proposta no PDF (capa e contracapa).
 *
 * Falha silenciosa: retorna null se o `qrcode` não conseguir gerar.
 * O template trata `qrCodeDataUrl == null` ocultando o bloco.
 */
import QRCode from "qrcode";

export async function generateQrDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: {
        dark: "#0a0e1a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (e) {
    console.warn("[generateQrDataUrl] falhou", e);
    return null;
  }
}
