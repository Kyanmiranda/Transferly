import { useEffect, useRef, useState } from "react";

type Area = { x: number; y: number; width: number; height: number };

export function IdentificationCropper({
  file,
  onApply,
}: {
  file: File;
  onApply: (file: File) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement>();
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let active = true;
    setImage(undefined);
    setArea(undefined);
    setRotation(0);
    setError("");
    img.onload = () => {
      if (active) setImage(img);
    };
    img.onerror = () => {
      if (active) setError("Could not preview this image. Try a JPG or PNG.");
    };
    img.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => {
    if (!image) return;
    const radians = (rotation * Math.PI) / 180;
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const w = image.naturalWidth * scale,
      h = image.naturalHeight * scale;
    const source = document.createElement("canvas");
    source.width = Math.ceil(Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians)));
    source.height = Math.ceil(Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians)));
    const ctx = source.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.translate(source.width / 2, source.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    base.current = source;
    setArea(undefined);
    const target = canvas.current;
    if (target) {
      target.width = source.width;
      target.height = source.height;
      target.getContext("2d")!.drawImage(source, 0, 0);
    }
  }, [image, rotation]);
  useEffect(() => {
    const target = canvas.current,
      source = base.current;
    if (!target || !source) return;
    const ctx = target.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    if (area && area.width > 0 && area.height > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, target.width, target.height);
      ctx.drawImage(
        source,
        area.x,
        area.y,
        area.width,
        area.height,
        area.x,
        area.y,
        area.width,
        area.height,
      );
      ctx.strokeStyle = "#21b78b";
      ctx.lineWidth = Math.max(2, target.width / 300);
      ctx.strokeRect(area.x, area.y, area.width, area.height);
    }
  }, [area]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          e.currentTarget.width,
          ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          e.currentTarget.height,
          ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
        ),
      ),
    };
  };
  const apply = () => {
    if (!base.current || !area || area.width < 30 || area.height < 30) return;
    setBusy(true);
    setError("");
    const output = document.createElement("canvas");
    const scale = Math.min(4, 2400 / Math.max(area.width, area.height));
    output.width = Math.round(area.width * scale);
    output.height = Math.round(area.height * scale);
    output
      .getContext("2d")!
      .drawImage(
        base.current,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        output.width,
        output.height,
      );
    output.toBlob((blob) => {
      setBusy(false);
      if (blob) onApply(new File([blob], "identification-cropped.png", { type: "image/png" }));
      else setError("Could not crop the image. Try selecting the area again.");
    }, "image/png");
  };
  return (
    <section className="panel mx-auto mt-5 max-w-4xl p-5">
      <h3 className="text-sm font-semibold">Improve identification scan</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Straighten the text, then drag a box around the licence. Include its bottom edge where the
        date of birth is printed.
      </p>
      <label className="my-4 flex flex-wrap items-center gap-3 text-xs">
        Straighten
        <input
          aria-label="Straighten identification"
          type="range"
          min="-180"
          max="180"
          step="1"
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
        />
        {rotation}°
        <button type="button" className="btn-outline btn-sm" onClick={() => setRotation(0)}>
          Reset
        </button>
      </label>
      <div className="flex justify-center rounded bg-muted p-2">
        <canvas
          ref={canvas}
          aria-label="Drag to select identification crop"
          className="max-h-[480px] max-w-full touch-none cursor-crosshair"
          style={{ width: "auto", height: "auto" }}
          onPointerDown={(e) => {
            start.current = point(e);
            e.currentTarget.setPointerCapture(e.pointerId);
            setArea(undefined);
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const p = point(e);
            setArea({
              x: Math.min(start.current.x, p.x),
              y: Math.min(start.current.y, p.y),
              width: Math.abs(p.x - start.current.x),
              height: Math.abs(p.y - start.current.y),
            });
          }}
          onPointerUp={() => {
            start.current = null;
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={busy || !area || area.width < 30 || area.height < 30}
          onClick={apply}
        >
          {busy ? "Applying crop…" : "Use selected area"}
        </button>
        <button
          className="btn-outline"
          type="button"
          disabled={!image}
          onClick={() => {
            if (base.current)
              setArea({ x: 0, y: 0, width: base.current.width, height: base.current.height });
          }}
        >
          Select entire image
        </button>
        <span className="text-xs text-muted-foreground">
          Optional. Cropping replaces only the file held in this session.
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
