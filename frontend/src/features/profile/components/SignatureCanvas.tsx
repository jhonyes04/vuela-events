import { useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';

const WIDTH = 500;
const HEIGHT = 180;

// Panel de dibujo libre para firmar con ratón o dedo. Exporta PNG en base64
// (fondo transparente) igual que el flujo de subir un archivo.
export function SignatureCanvas({
    onSave,
    saving,
}: {
    onSave: (imageBase64: string) => void;
    saving: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const [hasDrawing, setHasDrawing] = useState(false);

    const getContext = () => canvasRef.current?.getContext('2d') ?? null;

    const pointFrom = (e: PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();

        return {
            x: ((e.clientX - rect.left) / rect.width) * WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
        };
    };

    const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = true;

        const ctx = getContext();
        const { x, y } = pointFrom(e);

        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;

        const ctx = getContext();
        const { x, y } = pointFrom(e);

        if (!ctx) return;

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasDrawing(true);
    };

    const handlePointerUp = () => {
        drawingRef.current = false;
    };

    const handleClear = () => {
        const ctx = getContext();

        if (!ctx) return;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        setHasDrawing(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');

        onSave(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };

    return (
        <div className="grid gap-2">
            <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                className="w-full touch-none rounded-lg border bg-white"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
            <div className="flex gap-2 justify-between">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!hasDrawing}
                    onClick={handleClear}
                >
                    Volver a intentar
                </Button>
                <Button
                    type="button"
                    disabled={!hasDrawing || saving}
                    onClick={handleSave}
                >
                    {saving ? 'Guardando…' : 'Guardar firma'}
                </Button>
            </div>
        </div>
    );
}
