"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, startOfDay } from "@/lib/date";

const WHEEL_THRESHOLD = 24;
const SWIPE_CONFIRM_THRESHOLD = 48;
const DRAG_START_THRESHOLD = 10;
const NAV_LOCK_MS = 350;

export const DATE_NAV_SNAP_DURATION_MS = 220;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, button, select, a") !== null
  );
}

/**
 * ホイール(縦)は即座に前日・翌日へ切り替える。
 * 横スワイプは指の位置に追従して`dragOffset`(px)がリアルタイムに変化し、
 * 指を離した時に閾値を超えていれば日付を確定、超えなければ0へスナップバックする。
 * 未来日には移動不可。
 */
export function useDateNavigation() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((d) => addDays(d, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = addDays(d, 1);
      return next.getTime() > today.getTime() ? d : next;
    });
  }, [today]);

  const lockedRef = useRef(false);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    const step = (diff: number) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      if (diff > 0) goToNextDay();
      else goToPrevDay();
      window.setTimeout(() => {
        lockedRef.current = false;
      }, NAV_LOCK_MS);
    };

    const handleWheel = (e: WheelEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      step(e.deltaY);
    };

    let touchStart: { x: number; y: number } | null = null;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (isInteractiveTarget(e.target)) {
        touchStart = null;
        return;
      }
      const t = e.touches[0];
      touchStart = t ? { x: t.clientX, y: t.clientY } : null;
      isDragging = false;
      setIsSnapping(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart) return;
      const t = e.touches[0];
      if (!t) return;
      const diffX = t.clientX - touchStart.x;
      const diffY = t.clientY - touchStart.y;

      if (!isDragging) {
        if (Math.max(Math.abs(diffX), Math.abs(diffY)) < DRAG_START_THRESHOLD) {
          return;
        }
        if (Math.abs(diffX) <= Math.abs(diffY)) {
          // 縦方向優勢 = ページスクロールとみなし、以降このジェスチャーでは反応しない
          touchStart = null;
          return;
        }
        isDragging = true;
      }

      // 横方向のドラッグ中はブラウザの戻る/進むジェスチャーと衝突しないよう抑止する
      e.preventDefault();
      dragOffsetRef.current = diffX;
      setDragOffset(diffX);
    };

    const finishDrag = () => {
      if (!isDragging) {
        touchStart = null;
        return;
      }
      isDragging = false;
      touchStart = null;
      const offset = dragOffsetRef.current;
      setIsSnapping(true);

      if (Math.abs(offset) > SWIPE_CONFIRM_THRESHOLD) {
        const goNext = offset < 0;
        // 指を離した勢いのまま画面外へ抜けるように継続させてから中身を切り替える
        const flyOutOffset = offset < 0 ? -window.innerWidth : window.innerWidth;
        dragOffsetRef.current = flyOutOffset;
        setDragOffset(flyOutOffset);
        window.setTimeout(() => {
          if (goNext) goToNextDay();
          else goToPrevDay();
          setIsSnapping(false);
          dragOffsetRef.current = 0;
          setDragOffset(0);
        }, DATE_NAV_SNAP_DURATION_MS);
      } else {
        dragOffsetRef.current = 0;
        setDragOffset(0);
        window.setTimeout(() => setIsSnapping(false), DATE_NAV_SNAP_DURATION_MS);
      }
    };

    const handleTouchEnd = () => finishDrag();
    const handleTouchCancel = () => finishDrag();

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [goToNextDay, goToPrevDay]);

  return {
    selectedDate,
    isToday: selectedDate.getTime() === today.getTime(),
    goToPrevDay,
    goToNextDay,
    dragOffset,
    isSnapping,
  };
}
