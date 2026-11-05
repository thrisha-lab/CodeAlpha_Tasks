'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, Eraser, Minus, MousePointer2, Pencil, Square, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useAppStore } from '@/store/useAppStore'
import { getSocket } from '@/services/socket'
import type { WBAction, WBShapeKind } from '@/lib/rtc/types'

type Tool = 'pencil' | 'eraser' | 'rect' | 'ellipse' | 'line'

const COLORS = ['#0f172a', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0284c7', '#ffffff']

const TOOL_ICONS: Record<Tool, React.ComponentType<{ className?: string }>> = {
  pencil: Pencil,
  eraser: Eraser,
  rect: Square,
  ellipse: Circle,
  line: Minus,
}

/**
 * Collaborative whiteboard.
 *
 * - Canvas API for rendering; drawing data is NORMALIZED to 0..1 coordinates
 *   so every participant renders identically regardless of window size.
 * - Actions are emitted over Socket.io (`whiteboard:action`) and replayed on
 *   the server so late joiners receive the full board history.
 * - Pencil/eraser strokes are committed on pointer-up; shapes preview live.
 */
export function Whiteboard({ onClose }: { onClose: () => void }) {
  const wbActions = useAppStore((s) => s.wbActions)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(3)

  const drawing = useRef(false)
  const currentPoints = useRef<[number, number][]>([])
  const currentShape = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const dirtyRef = useRef(false) // something drawn that needs re-render

  // ---------------------------------------------------------------- render

  const render = useCallback((actions: WBAction[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { dpr, cssW, cssH } = setupCanvas(canvas)
    ctx.clearRect(0, 0, cssW * dpr, cssH * dpr)

    // white board background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cssW * dpr, cssH * dpr)

    for (const action of actions) {
      drawAction(ctx, action, cssW * dpr, cssH * dpr)
    }
  }, [])

  // Redraw whenever history changes or the container resizes.
  useEffect(() => {
    render(wbActions)
  }, [wbActions, render])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => render(useAppStore.getState().wbActions))
    ro.observe(container)
    return () => ro.disconnect()
  }, [render])

  // ---------------------------------------------------------------- input

  function toNormalized(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ]
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const p = toNormalized(e)
    if (tool === 'pencil' || tool === 'eraser') {
      currentPoints.current = [p]
    } else {
      currentShape.current = { x1: p[0], y1: p[1], x2: p[0], y2: p[1] }
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const p = toNormalized(e)
    if (tool === 'pencil' || tool === 'eraser') {
      currentPoints.current.push(p)
      // incremental live draw (no full replay while dragging)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const { dpr, cssW, cssH } = setupCanvas(canvas)
      const pts = currentPoints.current
      if (pts.length >= 2) {
        const action: WBAction =
          tool === 'pencil'
            ? { type: 'stroke', points: pts.slice(-2), color, width }
            : { type: 'erase', points: pts.slice(-2), width }
        drawAction(ctx, action, cssW * dpr, cssH * dpr)
      }
    } else if (currentShape.current) {
      currentShape.current.x2 = p[0]
      currentShape.current.y2 = p[1]
      dirtyRef.current = true
      // preview: replay history + shape preview
      render([
        ...useAppStore.getState().wbActions,
        {
          type: 'shape',
          shape: tool as WBShapeKind,
          ...currentShape.current,
          color,
          width,
        },
      ])
    }
  }

  function onPointerUp() {
    if (!drawing.current) return
    drawing.current = false
    const socket = getSocket()
    let action: WBAction | null = null

    if (tool === 'pencil' && currentPoints.current.length >= 2) {
      action = { type: 'stroke', points: currentPoints.current, color, width }
    } else if (tool === 'eraser' && currentPoints.current.length >= 2) {
      action = { type: 'erase', points: currentPoints.current, width }
    } else if (tool !== 'pencil' && tool !== 'eraser' && currentShape.current) {
      const s = currentShape.current
      if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.005) {
        action = { type: 'shape', shape: tool as WBShapeKind, ...s, color, width }
      }
    }

    currentPoints.current = []
    currentShape.current = null

    if (action) {
      // local state first (server relays to others, not back to us)
      useAppStore.getState().pushWbAction(action)
      socket?.emit('whiteboard:action', { action })
    } else {
      render(useAppStore.getState().wbActions)
    }
  }

  function clearBoard() {
    useAppStore.getState().pushWbAction({ type: 'clear' })
    getSocket()?.emit('whiteboard:action', { action: { type: 'clear' } })
  }

  return (
    <div className="flex h-full flex-col" ref={containerRef}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MousePointer2 className="h-3.5 w-3.5" aria-hidden /> Whiteboard
        </span>

        {(Object.keys(TOOL_ICONS) as Tool[]).map((t) => {
          const Icon = TOOL_ICONS[t]
          return (
            <Button
              key={t}
              size="icon"
              variant="ghost"
              onClick={() => setTool(t)}
              aria-label={t}
              aria-pressed={tool === t}
              className={`h-8 w-8 rounded-lg ${tool === t ? 'bg-primary text-white shadow-sm hover:bg-primary/90' : 'text-slate-500 hover:bg-secondary hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}

        <div className="mx-1 h-6 w-px bg-border" aria-hidden />

        <div className="flex items-center gap-1" role="radiogroup" aria-label="Drawing color">
          {COLORS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={color === c}
              aria-label={`Color ${c}`}
              onClick={() => {
                setColor(c)
                if (tool === 'eraser') setTool('pencil')
              }}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-primary' : 'border-slate-300 hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-border" aria-hidden />

        <div className="flex w-28 items-center gap-2" aria-label="Stroke width">
          <Slider
            value={[width]}
            min={1}
            max={12}
            step={1}
            onValueChange={(v) => setWidth(v[0] ?? 3)}
            aria-label="Stroke width"
          />
          <span className="w-4 text-center text-xs text-muted-foreground">{width}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={clearBoard}
            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-card text-rose-600 shadow-xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close whiteboard"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* canvas */}
      <div className="flex-1 overflow-hidden bg-secondary p-2 sm:p-4">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair rounded-xl bg-white shadow-card touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          role="img"
          aria-label="Collaborative whiteboard canvas"
        />
      </div>
    </div>
  )
}

/** Size the canvas backing store to its CSS size × devicePixelRatio. */
function setupCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const cssW = Math.max(1, Math.round(rect.width))
  const cssH = Math.max(1, Math.round(rect.height))
  const dpr = window.devicePixelRatio || 1
  const pxW = Math.round(cssW * dpr)
  const pxH = Math.round(cssH * dpr)
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW
    canvas.height = pxH
  }
  return { dpr, cssW, cssH }
}

function drawAction(
  ctx: CanvasRenderingContext2D,
  action: WBAction,
  canvasW: number,
  canvasH: number,
) {
  if (action.type === 'clear') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasW, canvasH)
    return
  }

  if (action.type === 'stroke' || action.type === 'erase') {
    ctx.globalCompositeOperation = action.type === 'erase' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = action.type === 'stroke' ? action.color : '#0f172a'
    ctx.lineWidth = action.width * (action.type === 'erase' ? 4 : 1) * (canvasW / 1000)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    action.points.forEach(([nx, ny], i) => {
      const x = nx * canvasW
      const y = ny * canvasH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    if (action.points.length === 1) {
      const [nx, ny] = action.points[0]
      ctx.lineTo(nx * canvasW + 0.1, ny * canvasH + 0.1)
    }
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  // shapes
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = action.color
  ctx.lineWidth = action.width * (canvasW / 1000)
  ctx.lineCap = 'round'
  const x1 = action.x1 * canvasW
  const y1 = action.y1 * canvasH
  const x2 = action.x2 * canvasW
  const y2 = action.y2 * canvasH
  ctx.beginPath()
  if (action.shape === 'rect') {
    ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
  } else if (action.shape === 'ellipse') {
    ctx.ellipse(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      Math.abs(x2 - x1) / 2,
      Math.abs(y2 - y1) / 2,
      0,
      0,
      Math.PI * 2,
    )
  } else {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.stroke()
}
