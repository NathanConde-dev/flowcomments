'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Minus, Plus, Trash2 } from 'lucide-react';
import { FlowNode, nodeMeta } from './FlowNode';
import type { AutomationDraft, FlowNodeId, IGAccountOption, NodePosition } from './types';
import { DEFAULT_NODE_POSITIONS, TRIGGER_KIND_LABELS } from './types';
import { cn } from '@/lib/utils/cn';

interface FlowCanvasProps {
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  selected: FlowNodeId | null;
  onSelect: (id: FlowNodeId | null) => void;
  onChange: (draft: AutomationDraft) => void;
}

type ContextMenuState = {
  nodeId: FlowNodeId;
  x: number;
  y: number;
} | null;

type NodeDragState = {
  id: FlowNodeId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

const DRAG_THRESHOLD = 5;

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const INSERT_GAP = 160;
const WORKSPACE_MIN = 1600;
const WORKSPACE_PAD = 560;
const EDGE_SCROLL = 56;
const EDGE_SPEED = 18;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

const PALETTE: FlowNodeId[] = [
  'reply',
  'dm',
  'followCheck',
  'delay',
  'condition',
  'addTag',
  'askInput',
];

function nodeVisible(draft: AutomationDraft, id: FlowNodeId) {
  if (id === 'start' || id === 'trigger') return true;
  if (id === 'reply') {
    return (
      draft.replyEnabled &&
      (draft.triggerKind === 'comment' || draft.triggerKind === 'live_comment')
    );
  }
  if (id === 'followCheck') return draft.followCheckEnabled;
  if (id === 'dm') return draft.dmEnabled || draft.followCheckEnabled;
  if (id === 'dmNotFollowing') return draft.followCheckEnabled;
  if (id === 'delay') return draft.delayEnabled;
  if (id === 'condition') return draft.conditionEnabled;
  if (id === 'addTag') return draft.addTagEnabled;
  if (id === 'askInput') return draft.askInputEnabled;
  return false;
}

type FlowEdge = { from: FlowNodeId; to: FlowNodeId; label?: string };

type InsertSlot = {
  id: string;
  from: FlowNodeId;
  to: FlowNodeId;
  x: number;
  y: number;
  label: string;
};

function buildEdges(draft: AutomationDraft): FlowEdge[] {
  const edges: FlowEdge[] = [{ from: 'start', to: 'trigger' }];
  let prev: FlowNodeId = 'trigger';

  const push = (to: FlowNodeId, label?: string) => {
    edges.push({ from: prev, to, label });
    prev = to;
  };

  if (nodeVisible(draft, 'reply')) push('reply');
  if (draft.delayEnabled) push('delay');
  if (draft.conditionEnabled) push('condition');
  if (draft.addTagEnabled) push('addTag');
  if (draft.askInputEnabled) push('askInput');

  if (draft.followCheckEnabled) {
    edges.push({ from: prev, to: 'followCheck' });
    edges.push({ from: 'followCheck', to: 'dm', label: 'Sim' });
    edges.push({ from: 'followCheck', to: 'dmNotFollowing', label: 'Não' });
    return edges;
  }

  if (draft.dmEnabled) push('dm');
  return edges;
}

function buildInsertSlots(
  edges: FlowEdge[],
  positionOf: (id: FlowNodeId) => NodePosition
): InsertSlot[] {
  return edges.map((edge) => {
    const from = positionOf(edge.from);
    const to = positionOf(edge.to);
    const x = (from.x + to.x) / 2 + 140 - 18;
    const y = (from.y + to.y) / 2 + 40 - 18;
    const afterTitle = nodeMeta[edge.from].title;
    const beforeTitle = nodeMeta[edge.to].title;
    return {
      id: `${edge.from}->${edge.to}`,
      from: edge.from,
      to: edge.to,
      x,
      y,
      label: edge.label
        ? `Entre ${afterTitle} e ${beforeTitle} (${edge.label})`
        : `Entre ${afterTitle} e ${beforeTitle}`,
    };
  });
}

function nearestInsertSlot(
  slots: InsertSlot[],
  point: { x: number; y: number },
  maxDist = 110
): InsertSlot | null {
  let best: InsertSlot | null = null;
  let bestDist = maxDist;
  for (const slot of slots) {
    const cx = slot.x + 18;
    const cy = slot.y + 18;
    const dist = Math.hypot(point.x - cx, point.y - cy);
    if (dist < bestDist) {
      best = slot;
      bestDist = dist;
    }
  }
  return best;
}

function mergeNodePositions(
  positions: Partial<Record<FlowNodeId, NodePosition>>
): Record<FlowNodeId, NodePosition> {
  return { ...DEFAULT_NODE_POSITIONS, ...positions };
}

function nodesDownstream(edges: FlowEdge[], start: FlowNodeId): Set<FlowNodeId> {
  const children = new Map<FlowNodeId, FlowNodeId[]>();
  for (const edge of edges) {
    const list = children.get(edge.from) || [];
    list.push(edge.to);
    children.set(edge.from, list);
  }
  const seen = new Set<FlowNodeId>();
  const stack: FlowNodeId[] = [start];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of children.get(id) || []) stack.push(child);
  }
  return seen;
}

function computeInsertLayout(
  edges: FlowEdge[],
  positions: Record<FlowNodeId, NodePosition>,
  slot: InsertSlot,
  gap = INSERT_GAP
): { positions: Record<FlowNodeId, NodePosition>; insertAt: NodePosition } {
  const from = positions[slot.from] || DEFAULT_NODE_POSITIONS[slot.from];
  const to = positions[slot.to] || DEFAULT_NODE_POSITIONS[slot.to];
  const currentGap = to.y - (from.y + NODE_HEIGHT);
  const dy = Math.max(gap, currentGap + 8) - Math.max(currentGap, 0);

  const next: Record<FlowNodeId, NodePosition> = { ...positions };
  for (const id of nodesDownstream(edges, slot.to)) {
    const pos = positions[id] || DEFAULT_NODE_POSITIONS[id];
    next[id] = { x: pos.x, y: pos.y + dy };
  }

  const insertAt = clampPos(
    (from.x + to.x) / 2,
    from.y + NODE_HEIGHT + Math.max(24, Math.round(dy / 2) - NODE_HEIGHT / 2)
  );

  return { positions: next, insertAt };
}

function clampPos(x: number, y: number): NodePosition {
  return {
    x: Math.max(16, x),
    y: Math.max(16, y),
  };
}

function clientToWorld(
  canvas: HTMLDivElement,
  clientX: number,
  clientY: number,
  zoom: number
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left + canvas.scrollLeft) / zoom,
    y: (clientY - rect.top + canvas.scrollTop) / zoom,
  };
}

function dropPosition(
  canvas: HTMLDivElement,
  event: React.DragEvent,
  zoom: number
): NodePosition {
  const point = clientToWorld(canvas, event.clientX, event.clientY, zoom);
  return clampPos(point.x - 140, point.y - 40);
}

export function FlowCanvas({ draft, accounts, selected, onSelect, onChange }: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const zoomRef = useRef(ZOOM_DEFAULT);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const nodeDragRef = useRef<NodeDragState | null>(null);
  const livePositionsRef = useRef<Partial<Record<FlowNodeId, NodePosition>>>({});
  const suppressClickRef = useRef(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [panning, setPanning] = useState(false);
  const [draggingId, setDraggingId] = useState<FlowNodeId | null>(null);
  const [livePositions, setLivePositions] = useState<Partial<Record<FlowNodeId, NodePosition>>>({});
  const [menu, setMenu] = useState<ContextMenuState>(null);
  const [paletteDrag, setPaletteDrag] = useState<{
    id: FlowNodeId;
    pos: NodePosition | null;
    overCanvas: boolean;
    slotId: string | null;
  } | null>(null);
  const [layoutPreview, setLayoutPreview] = useState<Partial<
    Record<FlowNodeId, NodePosition>
  > | null>(null);
  const account = accounts.find((a) => a.id === draft.igAccountId);
  const keywords = draft.keywords.map((k) => k.trim()).filter(Boolean);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const applyZoomAtPoint = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clamped = clampZoom(nextZoom);
    const current = zoomRef.current;
    if (clamped === current) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const worldX = (offsetX + canvas.scrollLeft) / current;
    const worldY = (offsetY + canvas.scrollTop) / current;

    zoomRef.current = clamped;
    setZoom(clamped);

    requestAnimationFrame(() => {
      const el = canvasRef.current;
      if (!el) return;
      el.scrollLeft = worldX * clamped - offsetX;
      el.scrollTop = worldY * clamped - offsetY;
    });
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setZoom((z) => clampZoom(z + delta));
        return;
      }
      const rect = canvas.getBoundingClientRect();
      applyZoomAtPoint(zoomRef.current + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [applyZoomAtPoint]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      applyZoomAtPoint(zoomRef.current + factor, event.clientX, event.clientY);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyZoomAtPoint]);

  const visibleNodes = useMemo(
    () =>
      (
        [
          'start',
          'trigger',
          'reply',
          'delay',
          'condition',
          'addTag',
          'askInput',
          'followCheck',
          'dm',
          'dmNotFollowing',
        ] as FlowNodeId[]
      ).filter((id) => nodeVisible(draft, id)),
    [draft]
  );

  const edges = useMemo(() => buildEdges(draft), [draft]);

  const basePositionOf = (id: FlowNodeId): NodePosition =>
    draft.nodePositions[id] || DEFAULT_NODE_POSITIONS[id];

  const positionOf = (id: FlowNodeId): NodePosition =>
    livePositions[id] || layoutPreview?.[id] || basePositionOf(id);

  const focusNodeInView = useCallback((id: FlowNodeId) => {
    const run = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos =
        livePositionsRef.current[id] ||
        draftRef.current.nodePositions[id] ||
        DEFAULT_NODE_POSITIONS[id];
      const z = zoomRef.current;
      const targetLeft = (pos.x + NODE_WIDTH / 2) * z - canvas.clientWidth / 2;
      const targetTop = (pos.y + NODE_HEIGHT / 2) * z - canvas.clientHeight / 2;
      canvas.scrollTo({
        left: Math.max(0, targetLeft),
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    };
    // Aguarda layout do inspector / workspace antes de medir o viewport
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const selectNode = useCallback(
    (id: FlowNodeId) => {
      onSelect(id);
      focusNodeInView(id);
    },
    [onSelect, focusNodeInView]
  );

  // Slots usam posições commitadas (sem preview) pra hit-test estável
  const insertSlots = useMemo(
    () => (paletteDrag ? buildInsertSlots(edges, basePositionOf) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basePositionOf depends on draft positions
    [paletteDrag, edges, draft.nodePositions]
  );

  const workspace = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const id of visibleNodes) {
      const pos = positionOf(id);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    }
    return {
      width: Math.max(WORKSPACE_MIN, maxX + WORKSPACE_PAD),
      height: Math.max(WORKSPACE_MIN, maxY + WORKSPACE_PAD),
    };
  }, [draft.nodePositions, livePositions, layoutPreview, visibleNodes]);

  const stopPan = (pointerId?: number) => {
    const pan = panRef.current;
    if (!pan) return;
    if (pointerId != null && pan.pointerId !== pointerId) return;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(pan.pointerId)) {
      canvas.releasePointerCapture(pan.pointerId);
    }
    const shouldDeselect = !pan.moved;
    panRef.current = null;
    setPanning(false);
    if (shouldDeselect) {
      setMenu(null);
      onSelect(null);
    }
  };

  const finishNodeDrag = (pointerId?: number) => {
    const drag = nodeDragRef.current;
    if (!drag) return;
    if (pointerId != null && drag.pointerId !== pointerId) return;

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(drag.pointerId)) {
      canvas.releasePointerCapture(drag.pointerId);
    }

    // pointerdown usa preventDefault — o click nativo pode não disparar
    suppressClickRef.current = true;

    if (drag.moved) {
      const finalPos =
        livePositionsRef.current[drag.id] ||
        draftRef.current.nodePositions[drag.id] ||
        DEFAULT_NODE_POSITIONS[drag.id];
      const current = draftRef.current;
      onChange({
        ...current,
        nodePositions: {
          ...current.nodePositions,
          [drag.id]: finalPos,
        },
      });
    } else {
      setMenu(null);
      selectNode(drag.id);
    }

    nodeDragRef.current = null;
    livePositionsRef.current = {};
    setDraggingId(null);
    setLivePositions({});
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0 && event.button !== 1) return;
    if ((event.target as HTMLElement).closest('[data-flow-node], button')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    event.preventDefault();
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
    setPanning(true);
    setMenu(null);
  };

  const autoScrollWhileDragging = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (clientX > rect.right - EDGE_SCROLL) dx = EDGE_SPEED;
    else if (clientX < rect.left + EDGE_SCROLL) dx = -EDGE_SPEED;

    if (clientY > rect.bottom - EDGE_SCROLL) dy = EDGE_SPEED;
    else if (clientY < rect.top + EDGE_SCROLL) dy = -EDGE_SPEED;

    if (dx || dy) {
      canvas.scrollLeft += dx;
      canvas.scrollTop += dy;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = zoomRef.current;

    const drag = nodeDragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      if (!drag.moved) {
        const dist = Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY
        );
        if (dist < DRAG_THRESHOLD) return;
        drag.moved = true;
        setDraggingId(drag.id);
        setMenu(null);
      }

      const point = clientToWorld(canvas, event.clientX, event.clientY, scale);
      const next = clampPos(point.x - drag.offsetX, point.y - drag.offsetY);
      livePositionsRef.current = { ...livePositionsRef.current, [drag.id]: next };
      setLivePositions(livePositionsRef.current);
      autoScrollWhileDragging(event.clientX, event.clientY);
      return;
    }

    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pan.moved = true;
    canvas.scrollLeft = pan.scrollLeft - dx;
    canvas.scrollTop = pan.scrollTop - dy;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (nodeDragRef.current?.pointerId === event.pointerId) {
      finishNodeDrag(event.pointerId);
      return;
    }
    stopPan(event.pointerId);
  };

  const startNodeDrag = (id: FlowNodeId, event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    stopPan();
    setMenu(null);

    const pos = positionOf(id);
    const point = clientToWorld(canvas, event.clientX, event.clientY, zoomRef.current);
    const offsetX = point.x - pos.x;
    const offsetY = point.y - pos.y;

    nodeDragRef.current = {
      id,
      pointerId: event.pointerId,
      offsetX,
      offsetY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
    livePositionsRef.current = { [id]: pos };
    setLivePositions({ [id]: pos });
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const addNode = (
    id: FlowNodeId,
    position?: NodePosition,
    positionsOverride?: Record<FlowNodeId, NodePosition>
  ) => {
    const basePositions = positionsOverride || mergeNodePositions(draft.nodePositions);
    const nextPos = position || basePositions[id] || DEFAULT_NODE_POSITIONS[id];
    const withPos = (key: FlowNodeId) => ({ ...basePositions, [key]: nextPos });

    if (id === 'reply') {
      onChange({ ...draft, replyEnabled: true, nodePositions: withPos('reply') });
      selectNode('reply');
      return;
    }
    if (id === 'dm') {
      if (draft.followCheckEnabled) {
        selectNode('dm');
        return;
      }
      onChange({
        ...draft,
        dmEnabled: true,
        followCheckEnabled: false,
        nodePositions: {
          ...basePositions,
          dm:
            !position && nextPos.x === DEFAULT_NODE_POSITIONS.dm.x
              ? { x: 260, y: 450 }
              : nextPos,
        },
      });
      selectNode('dm');
      return;
    }
    if (id === 'followCheck') {
      onChange({
        ...draft,
        followCheckEnabled: true,
        dmEnabled: true,
        gatePrompt:
          draft.gatePrompt.trim() ||
          'Toque abaixo pra receber o conteúdo — precisa estar me seguindo.',
        gateButtonLabel: draft.gateButtonLabel.trim() || 'Já sigo',
        recheckButtonLabel: draft.recheckButtonLabel.trim() || 'Verificar de novo',
        dmIfNotFollowing:
          draft.dmIfNotFollowing.trim() ||
          'Me segue e toca em Verificar de novo pra eu liberar o conteúdo.',
        nodePositions: {
          ...basePositions,
          followCheck: nextPos,
          dm: position
            ? { x: nextPos.x - 180, y: nextPos.y + INSERT_GAP }
            : basePositions.dm || DEFAULT_NODE_POSITIONS.dm,
          dmNotFollowing: position
            ? { x: nextPos.x + 180, y: nextPos.y + INSERT_GAP }
            : basePositions.dmNotFollowing || DEFAULT_NODE_POSITIONS.dmNotFollowing,
        },
      });
      selectNode('followCheck');
      return;
    }
    if (id === 'delay') {
      onChange({ ...draft, delayEnabled: true, nodePositions: withPos('delay') });
      selectNode('delay');
      return;
    }
    if (id === 'condition') {
      onChange({ ...draft, conditionEnabled: true, nodePositions: withPos('condition') });
      selectNode('condition');
      return;
    }
    if (id === 'addTag') {
      onChange({
        ...draft,
        addTagEnabled: true,
        tagToAdd: draft.tagToAdd || 'lead',
        nodePositions: withPos('addTag'),
      });
      selectNode('addTag');
      return;
    }
    if (id === 'askInput') {
      onChange({
        ...draft,
        askInputEnabled: true,
        askInputPrompt: draft.askInputPrompt || 'Me envia seu e-mail, por favor:',
        askInputSaveKey: draft.askInputSaveKey || 'email',
        nodePositions: withPos('askInput'),
      });
      selectNode('askInput');
    }
  };

  const removeNode = (id: FlowNodeId) => {
    setMenu(null);
    const clear = (patch: Partial<AutomationDraft>) => {
      onChange({ ...draft, ...patch });
      if (selected === id) onSelect(null);
    };
    if (id === 'reply') return clear({ replyEnabled: false });
    if (id === 'dm') {
      if (draft.followCheckEnabled) {
        selectNode('followCheck');
        return;
      }
      return clear({ dmEnabled: false });
    }
    if (id === 'followCheck' || id === 'dmNotFollowing') {
      onChange({
        ...draft,
        followCheckEnabled: false,
        dmEnabled: Boolean(draft.sendDm.trim()),
        nodePositions: { ...draft.nodePositions, dm: { x: 260, y: 450 } },
      });
      if (selected === 'followCheck' || selected === 'dmNotFollowing') {
        if (draft.sendDm.trim()) selectNode('dm');
        else onSelect(null);
      }
      return;
    }
    if (id === 'delay') return clear({ delayEnabled: false });
    if (id === 'condition') return clear({ conditionEnabled: false });
    if (id === 'addTag') return clear({ addTagEnabled: false });
    if (id === 'askInput') return clear({ askInputEnabled: false });
  };

  const paletteDragRef = useRef(paletteDrag);
  useEffect(() => {
    paletteDragRef.current = paletteDrag;
  }, [paletteDrag]);

  const clearPaletteDrag = () => {
    setPaletteDrag(null);
    setLayoutPreview(null);
  };

  const isPaletteDragEvent = (event: React.DragEvent) => {
    const types = Array.from(event.dataTransfer.types || []);
    return Boolean(paletteDragRef.current) || types.includes('application/x-fc-node');
  };

  const handleCanvasDragOver = (event: React.DragEvent) => {
    if (!isPaletteDragEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const canvas = canvasRef.current;
    if (!canvas) return;
    const freePos = dropPosition(canvas, event, zoomRef.current);
    const world = clientToWorld(canvas, event.clientX, event.clientY, zoomRef.current);
    const slots = buildInsertSlots(edges, (id) =>
      draftRef.current.nodePositions[id] || DEFAULT_NODE_POSITIONS[id]
    );
    const nearest = nearestInsertSlot(slots, world);
    const nextSlotId = nearest?.id ?? null;
    const prevSlotId = paletteDragRef.current?.slotId ?? null;

    let pos = freePos;
    if (nearest) {
      const { insertAt, positions } = computeInsertLayout(
        edges,
        mergeNodePositions(draftRef.current.nodePositions),
        nearest
      );
      pos = insertAt;
      if (nextSlotId !== prevSlotId) setLayoutPreview(positions);
    } else if (prevSlotId) {
      setLayoutPreview(null);
    }

    setPaletteDrag((prev) => {
      if (!prev) return prev;
      const same =
        prev.overCanvas &&
        prev.slotId === nextSlotId &&
        prev.pos &&
        Math.abs(prev.pos.x - pos.x) < 2 &&
        Math.abs(prev.pos.y - pos.y) < 2;
      if (same) return prev;
      return {
        ...prev,
        overCanvas: true,
        pos,
        slotId: nextSlotId,
      };
    });
  };

  const handleCanvasDragLeave = (event: React.DragEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const next = event.relatedTarget as Node | null;
    if (next && canvas.contains(next)) return;
    setLayoutPreview(null);
    setPaletteDrag((prev) =>
      prev ? { ...prev, overCanvas: false, pos: null, slotId: null } : prev
    );
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const type =
      (event.dataTransfer.getData('application/x-fc-node') as FlowNodeId) ||
      paletteDrag?.id;
    const world = clientToWorld(canvas, event.clientX, event.clientY, zoomRef.current);
    const committed = mergeNodePositions(draftRef.current.nodePositions);
    const slots = buildInsertSlots(edges, (id) => committed[id]);
    const nearest = nearestInsertSlot(slots, world);
    clearPaletteDrag();
    if (!(type && PALETTE.includes(type))) return;

    if (nearest) {
      const { positions, insertAt } = computeInsertLayout(edges, committed, nearest);
      addNode(type, insertAt, positions);
      return;
    }

    addNode(type, dropPosition(canvas, event, zoomRef.current));
  };

  const summaryFor = (id: FlowNodeId) => {
    if (id === 'start') {
      return (
        <div className="space-y-1">
          <p className="truncate font-medium text-foreground">
            {draft.name.trim() || 'Sem nome'}
          </p>
          <p className="truncate text-xs">
            {account ? `@${account.igUsername}` : 'Selecione uma conta'}
          </p>
        </div>
      );
    }
    if (id === 'trigger') {
      return (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {TRIGGER_KIND_LABELS[draft.triggerKind]}
          </p>
          {(draft.triggerKind === 'comment' || draft.triggerKind === 'live_comment') && (
            <p className="text-xs">
              {draft.mediaScope === 'any'
                ? 'Qualquer publicação'
                : `${draft.selectedPosts.length} publicação${draft.selectedPosts.length === 1 ? '' : 'ões'}`}
            </p>
          )}
          {draft.triggerKind === 'default_reply' || draft.triggerKind === 'story_mention' ? (
            <span className="text-xs">Dispara automaticamente</span>
          ) : keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 4).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs">Defina palavras-chave</span>
          )}
        </div>
      );
    }
    if (id === 'reply') {
      return (
        <p className="line-clamp-2 text-xs leading-relaxed">
          {draft.replyComment.trim() || 'Escreva a resposta do comentário'}
        </p>
      );
    }
    if (id === 'delay') {
      return <p className="text-xs font-medium text-foreground">Espera {draft.delaySeconds}s</p>;
    }
    if (id === 'condition') {
      return (
        <p className="text-xs">
          {draft.conditionRule === 'has_tag'
            ? `Tem tag: ${draft.conditionTag || '—'}`
            : draft.conditionRule === 'follows'
              ? 'Segue a conta'
              : `${draft.conditionField || 'campo'} = ${draft.conditionValue || '—'}`}
        </p>
      );
    }
    if (id === 'addTag') {
      return <p className="text-xs font-medium">#{draft.tagToAdd || 'tag'}</p>;
    }
    if (id === 'askInput') {
      return (
        <p className="line-clamp-2 text-xs">
          {draft.askInputPrompt.trim() || 'Pedir dado ao contato'} · {draft.askInputSaveKey}
        </p>
      );
    }
    if (id === 'followCheck') {
      return (
        <div className="space-y-1">
          <p className="line-clamp-2 text-xs leading-relaxed">
            {draft.gatePrompt.trim() || 'Private reply com botão de confirmação'}
          </p>
          <p className="text-[11px] font-medium text-primary-600">
            Botão: {draft.gateButtonLabel.trim() || 'Já sigo'}
          </p>
        </div>
      );
    }
    if (id === 'dmNotFollowing') {
      return (
        <div className="space-y-1">
          <p className="line-clamp-2 text-xs leading-relaxed">
            {draft.dmIfNotFollowing.trim() || 'Peça pra pessoa te seguir'}
          </p>
          <p className="text-[11px] font-medium text-primary-600">
            {draft.recheckButtonLabel.trim() || 'Verificar de novo'}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <p className="line-clamp-2 text-xs leading-relaxed">
          {draft.sendDm.trim() ||
            (draft.followCheckEnabled
              ? 'Conteúdo liberado se estiver seguindo'
              : 'Escreva a mensagem do direct')}
        </p>
        {draft.dmButtons.length > 0 && (
          <p className="text-[11px] font-medium text-primary-600">
            {draft.dmButtons.length} botão(ões)
            {draft.dmButtons.some((b) => b.requireFollow) ? ' · exige follow' : ''}
          </p>
        )}
        {draft.followCheckEnabled && (
          <p className="text-[11px] font-medium text-emerald-600">Ramo: segue</p>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full min-h-[520px] flex-1">
      <aside
        className={cn(
          'z-20 flex shrink-0 flex-col border-r border-border bg-white/95 backdrop-blur-sm transition-[width] duration-200 ease-out',
          paletteOpen ? 'w-[220px]' : 'w-12'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1 border-b border-border/70',
            paletteOpen ? 'justify-between px-3 py-2.5' : 'justify-center px-1 py-2.5'
          )}
        >
          {paletteOpen && (
            <div className="min-w-0 px-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Blocos
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Arraste para o canvas
              </p>
            </div>
          )}
          <button
            type="button"
            aria-label={paletteOpen ? 'Recolher blocos' : 'Expandir blocos'}
            title={paletteOpen ? 'Recolher' : 'Blocos'}
            onClick={() => setPaletteOpen((open) => !open)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
          >
            {paletteOpen ? (
              <ChevronsLeft className="h-4 w-4" strokeWidth={2.25} />
            ) : (
              <ChevronsRight className="h-4 w-4" strokeWidth={2.25} />
            )}
          </button>
        </div>

        <div className={cn('flex flex-col gap-2', paletteOpen ? 'p-3' : 'items-center gap-1.5 p-1.5')}>
          {PALETTE.map((id) => {
            const meta = nodeMeta[id];
            const Icon = meta.icon;
            const onCanvas = nodeVisible(draft, id);
            return (
              <button
                key={id}
                type="button"
                draggable={!onCanvas}
                disabled={onCanvas}
                title={meta.title}
                onDragStart={(event) => {
                  if (onCanvas) return;
                  event.dataTransfer.setData('application/x-fc-node', id);
                  event.dataTransfer.effectAllowed = 'copy';
                  setPaletteDrag({ id, pos: null, overCanvas: false, slotId: null });
                }}
                onDragEnd={clearPaletteDrag}
                onClick={() => {
                  if (onCanvas) {
                    selectNode(id);
                    return;
                  }
                  const base = draft.nodePositions[id] || DEFAULT_NODE_POSITIONS[id];
                  addNode(id, {
                    x: base.x + visibleNodes.length * 12,
                    y: base.y + visibleNodes.length * 18,
                  });
                }}
                className={cn(
                  'transition-colors',
                  paletteOpen
                    ? cn(
                        'flex cursor-grab items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left active:cursor-grabbing',
                        onCanvas
                          ? 'cursor-pointer border-border bg-muted/50 opacity-70'
                          : 'border-border bg-white shadow-soft hover:border-zinc-300 hover:bg-zinc-50'
                      )
                    : cn(
                        'flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border-0 bg-transparent shadow-none active:cursor-grabbing',
                        onCanvas
                          ? 'cursor-pointer opacity-45'
                          : 'hover:bg-zinc-100'
                      )
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex shrink-0 items-center justify-center rounded',
                    paletteOpen ? 'mt-0.5 h-7 w-7' : 'h-7 w-7',
                    meta.well
                  )}
                >
                  <Icon
                    className={cn('h-3.5 w-3.5', meta.iconClass)}
                    strokeWidth={2.25}
                  />
                  {!onCanvas && paletteOpen && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-900 text-white">
                      <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                {paletteOpen && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-snug text-foreground">
                      {meta.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                      {onCanvas ? 'No fluxo · clique para editar' : 'Arraste para o canvas'}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div
        ref={canvasRef}
        className={cn(
          'fc-canvas-dot-dense fc-scrollbar-minimal relative min-h-[520px] flex-1 overflow-auto transition-[box-shadow,background-color] duration-150',
          draggingId ? 'cursor-grabbing' : panning ? 'cursor-grabbing select-none' : 'cursor-grab',
          paletteDrag && 'cursor-copy',
          paletteDrag?.overCanvas && 'ring-2 ring-inset ring-zinc-900/20'
        )}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        onClick={() => setMenu(null)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {paletteDrag && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
            <p
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold shadow-soft backdrop-blur-sm transition-colors',
                paletteDrag.overCanvas
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-border bg-white/95 text-muted-foreground'
              )}
            >
              {!paletteDrag.overCanvas
                ? `Arraste “${nodeMeta[paletteDrag.id].title}” para o canvas`
                : paletteDrag.slotId
                  ? `Solte para inserir ${
                      insertSlots.find((s) => s.id === paletteDrag.slotId)?.label.toLowerCase() ||
                      'no fluxo'
                    }`
                  : `Solte para adicionar “${nodeMeta[paletteDrag.id].title}”`}
            </p>
          </div>
        )}
        <div
          className="relative"
          style={{
            width: workspace.width * zoom,
            height: workspace.height * zoom,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: workspace.width,
              height: workspace.height,
              transform: `scale(${zoom})`,
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={workspace.width}
              height={workspace.height}
            >
              {edges.map((edge) => {
                const from = positionOf(edge.from);
                const to = positionOf(edge.to);
                const x1 = from.x + 140;
                const y1 = from.y + 72;
                const x2 = to.x + 140;
                const y2 = to.y + 8;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                const edgeId = `${edge.from}->${edge.to}`;
                const slotActive = paletteDrag?.slotId === edgeId;
                return (
                  <g key={`${edge.from}-${edge.to}-${edge.label || ''}`}>
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                      stroke={
                        slotActive
                          ? 'rgba(24,24,27,0.75)'
                          : draggingId || paletteDrag
                            ? 'rgba(24,24,27,0.22)'
                            : 'rgba(24,24,27,0.35)'
                      }
                      strokeWidth={slotActive ? 3 : 2}
                      strokeDasharray={paletteDrag && !slotActive ? '6 6' : undefined}
                      fill="none"
                    />
                    {edge.label && !paletteDrag ? (
                      <text
                        x={midX}
                        y={midY - 6}
                        textAnchor="middle"
                        className="fill-zinc-500"
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {edge.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {visibleNodes.map((id) => {
              const pos = positionOf(id);
              const removable =
              id === 'reply' ||
              id === 'followCheck' ||
              id === 'delay' ||
              id === 'condition' ||
              id === 'addTag' ||
              id === 'askInput' ||
              (id === 'dm' && !draft.followCheckEnabled) ||
              id === 'dmNotFollowing';
              const isDragging = draggingId === id;
              return (
                <FlowNode
                  key={id}
                  id={id}
                  selected={selected === id}
                  dragging={isDragging}
                  onSelect={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    setMenu(null);
                    selectNode(id);
                  }}
                  onPointerDown={(event) => startNodeDrag(id, event)}
                  onContextMenu={
                    removable
                      ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setMenu({ nodeId: id, x: event.clientX, y: event.clientY });
                        }
                      : undefined
                  }
                  summary={summaryFor(id)}
                  className="absolute"
                  style={{
                    left: pos.x,
                    top: pos.y,
                  }}
                />
              );
            })}

            {paletteDrag?.overCanvas &&
              insertSlots.map((slot) => {
                const active = paletteDrag.slotId === slot.id;
                const markerPos =
                  active && paletteDrag.pos
                    ? {
                        x: paletteDrag.pos.x + NODE_WIDTH / 2 - 18,
                        y: paletteDrag.pos.y + 40 - 18,
                      }
                    : { x: slot.x, y: slot.y };
                return (
                  <div
                    key={slot.id}
                    className="pointer-events-none absolute z-20 flex flex-col items-center transition-[left,top] duration-200 ease-out"
                    style={{ left: markerPos.x, top: markerPos.y }}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-full border-2 transition-all duration-150',
                        active
                          ? 'h-9 w-9 scale-110 border-zinc-900 bg-zinc-900 text-white shadow-lg'
                          : 'h-7 w-7 border-zinc-400/80 bg-white text-zinc-500 shadow-soft'
                      )}
                    >
                      <Plus className={cn(active ? 'h-4 w-4' : 'h-3.5 w-3.5')} strokeWidth={2.5} />
                    </div>
                    {active && (
                      <span className="mt-1.5 max-w-[160px] rounded-full bg-zinc-900 px-2 py-0.5 text-center text-[10px] font-semibold leading-tight text-white shadow-soft">
                        {slot.label}
                      </span>
                    )}
                  </div>
                );
              })}

            {paletteDrag?.overCanvas && paletteDrag.pos && (
              <div
                className={cn(
                  'pointer-events-none absolute z-20 w-[280px] rounded-xl border-2 border-dashed p-4 transition-[left,top,opacity] duration-200 ease-out',
                  paletteDrag.slotId
                    ? 'border-zinc-900/55 bg-zinc-900/[0.06]'
                    : 'border-zinc-900/40 bg-zinc-900/[0.04]'
                )}
                style={{ left: paletteDrag.pos.x, top: paletteDrag.pos.y }}
              >
                <div className="flex items-start gap-3 opacity-80">
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                      nodeMeta[paletteDrag.id].well
                    )}
                  >
                    {(() => {
                      const Icon = nodeMeta[paletteDrag.id].icon;
                      return (
                        <Icon
                          className={cn('h-4 w-4', nodeMeta[paletteDrag.id].iconClass)}
                          strokeWidth={2.25}
                        />
                      );
                    })()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {nodeMeta[paletteDrag.id].title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paletteDrag.slotId
                        ? 'Solte para encaixar neste espaço'
                        : 'Solte livre ou aproxime de um + no fluxo'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {visibleNodes.length <= 2 && !paletteDrag && (
              <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
                <p className="rounded-full border border-border bg-white/90 px-3 py-1.5 text-xs text-muted-foreground shadow-soft">
                  Arraste blocos da esquerda para montar o fluxo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-30 flex items-center gap-1">
        <div className="pointer-events-auto flex items-center overflow-hidden rounded-xl border border-border bg-white/95 shadow-soft backdrop-blur-sm">
          <button
            type="button"
            aria-label="Diminuir zoom"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => zoomBy(-ZOOM_STEP)}
            className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Resetar zoom"
            title="Resetar para 100%"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) {
                setZoom(ZOOM_DEFAULT);
                zoomRef.current = ZOOM_DEFAULT;
                return;
              }
              const rect = canvas.getBoundingClientRect();
              applyZoomAtPoint(ZOOM_DEFAULT, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
            className="min-w-[3.25rem] px-2 text-center text-xs font-semibold tabular-nums text-foreground transition-colors hover:bg-zinc-50"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Aumentar zoom"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => zoomBy(ZOOM_STEP)}
            className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {menu && (
        <div
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"
            onClick={() => removeNode(menu.nodeId)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir bloco
          </button>
          <p className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">
            {nodeMeta[menu.nodeId].title}
          </p>
        </div>
      )}
    </div>
  );
}
