import { extractFields } from "./document-extraction";

export function validateDocument(file: File) {
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a PDF, JPG, PNG, or WebP file.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Choose a non-empty file up to 10 MB.");
}

export async function scanDocument(file: File, progress: (message: string) => void) {
  validateDocument(file);
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
  const recognize = async (image: File | HTMLCanvasElement) => {
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        cacheMethod: "none",
        logger: (m) =>
          progress(`${file.name}: ${m.status} ${Math.round((m.progress || 0) * 100)}%`),
      });
    }
    return (await worker.recognize(image)).data.text;
  };
  let text = "";
  try {
    if (file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > 30)
          throw new Error("PDFs are limited to 30 pages. Upload a shorter document.");
        for (let n = 1; n <= pdf.numPages; n++) {
          progress(`${file.name}: reading page ${n} of ${pdf.numPages}`);
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          let lastY: number | undefined;
          let pageText = "";
          for (const item of content.items) {
            if (!("str" in item)) continue;
            const y = item.transform[5] as number;
            if (lastY !== undefined && Math.abs(y - lastY) > 3) pageText += "\n";
            pageText += item.str + (item.hasEOL ? "\n" : " ");
            lastY = y;
          }
          if (pageText.replace(/\s/g, "").length < 30) {
            const viewport = page.getViewport({ scale: 2 });
            if (viewport.width * viewport.height > 20_000_000)
              throw new Error("PDF page is too large to scan. Export at a smaller page size.");
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            pageText = await recognize(canvas);
            canvas.width = canvas.height = 0;
          }
          text += pageText + "\n";
          page.cleanup();
        }
      } finally {
        await task.destroy();
      }
    } else {
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > 30_000_000) throw new Error("Image is too large. Resize below 30 megapixels.");
      text = await recognize(file);
    }
    if (!text.trim())
      throw new Error("No readable text found. Try a clearer image or a searchable PDF.");
    return extractFields(text, file.name);
  } finally {
    await worker?.terminate();
  }
}
