/**
 * SignaturePad Component
 * Canvas-based signature drawing for e-signatures
 */
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, Download, PenTool } from "lucide-react";

interface SignaturePadProps {
    onSignatureChange?: (dataUrl: string | null) => void;
    width?: number;
    height?: number;
    className?: string;
}

export function SignaturePad({
    onSignatureChange,
    width = 500,
    height = 200,
    className = ""
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Set drawing style
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Draw signature line
        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, height - 40);
        ctx.lineTo(width - 30, height - 40);
        ctx.stroke();

        // Add "Sign here" text
        ctx.fillStyle = "#9ca3af";
        ctx.font = "12px sans-serif";
        ctx.fillText("Sign here", 30, height - 20);

        // Reset stroke style for drawing
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
    }, [width, height]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ("touches" in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
            };
        }

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);

            // Notify parent of signature change
            if (hasSignature && onSignatureChange) {
                const dataUrl = canvasRef.current?.toDataURL("image/png");
                onSignatureChange(dataUrl || null);
            }
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        // Clear and redraw background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Redraw signature line
        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, height - 40);
        ctx.lineTo(width - 30, height - 40);
        ctx.stroke();

        // Redraw hint text
        ctx.fillStyle = "#9ca3af";
        ctx.font = "12px sans-serif";
        ctx.fillText("Sign here", 30, height - 20);

        // Reset stroke style
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;

        setHasSignature(false);
        onSignatureChange?.(null);
    };

    const downloadSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return;

        const link = document.createElement("a");
        link.download = "signature.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const getSignatureData = () => {
        if (!hasSignature) return null;
        return canvasRef.current?.toDataURL("image/png") || null;
    };

    return (
        <Card className={`p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PenTool className="h-4 w-4" />
                    <span>Draw your signature below</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        disabled={!hasSignature}
                    >
                        <Eraser className="h-4 w-4 mr-1" />
                        Clear
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadSignature}
                        disabled={!hasSignature}
                    >
                        <Download className="h-4 w-4 mr-1" />
                        Save
                    </Button>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                className="border rounded-lg cursor-crosshair touch-none w-full"
                style={{ maxWidth: width, height: "auto", aspectRatio: `${width}/${height}` }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />

            {hasSignature && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    ✓ Signature captured
                </p>
            )}
        </Card>
    );
}

export default SignaturePad;
