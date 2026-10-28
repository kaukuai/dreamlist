/** Touch ownership and click fallback for embedded browsers. Capture is optional. */
export type Axis = {x: number; y: number};
type Contact = {source: "touch" | "pointer"; id: number};
const clock = () => performance.now();
const findTouch = (list: TouchList, id: number) => Array.from(list).find(touch => touch.identifier === id);
const prevent = (event: Event) => {if (event.cancelable) event.preventDefault();};
const disabled = (element: HTMLElement) => (element as HTMLButtonElement).disabled;
const isControl = (target: EventTarget | null) => Boolean((target as Element | null)?.closest?.("button,a,input,textarea,select,[data-touch-control]"));

export function bindContact(element: HTMLElement, callbacks: {start: (point: Axis) => void; move: (point: Axis) => void; end: (cancelled: boolean) => void; click?: () => void}) {
  const doc = element.ownerDocument;let contact: Contact | null = null, lastEnd = -Infinity;
  const finish = (cancelled: boolean) => {if (!contact) return;contact = null;lastEnd = clock();callbacks.end(cancelled);};
  const pointerStart = (event: PointerEvent) => {
    if (event.button !== 0 || contact || disabled(element)) return;
    contact = {source: "pointer", id: event.pointerId};callbacks.start({x: event.clientX, y: event.clientY});
    try {element.setPointerCapture?.(event.pointerId);} catch { /* Document listeners retain ownership. */ }
  };
  const pointerMove = (event: PointerEvent) => {if (contact?.source === "pointer" && contact.id === event.pointerId) callbacks.move({x: event.clientX, y: event.clientY});};
  const pointerEnd = (event: PointerEvent) => {if (contact?.source === "pointer" && contact.id === event.pointerId) finish(event.type !== "pointerup");};
  const touchStart = (event: TouchEvent) => {
    if (disabled(element) || contact?.source === "touch") return;const point = event.changedTouches[0];if (!point) return;
    contact = {source: "touch", id: point.identifier};prevent(event);callbacks.start({x: point.clientX, y: point.clientY});
  };
  const touchMove = (event: TouchEvent) => {if (contact?.source !== "touch") return;const point = findTouch(event.changedTouches, contact.id);if (point) {prevent(event);callbacks.move({x: point.clientX, y: point.clientY});}};
  const touchEnd = (event: TouchEvent) => {if (contact?.source === "touch" && (findTouch(event.changedTouches, contact.id) || event.type === "touchcancel" && !event.changedTouches.length)) {prevent(event);finish(event.type === "touchcancel");}};
  const click = (event: MouseEvent) => {if (!disabled(element) && clock() - lastEnd >= 500 && !contact) {prevent(event);callbacks.click?.();}};
  const cancel = () => finish(true), visibility = () => {if (doc.hidden) cancel();};
  element.addEventListener("pointerdown", pointerStart);element.addEventListener("touchstart", touchStart, {passive: false});element.addEventListener("click", click);element.addEventListener("contextmenu", prevent);
  doc.addEventListener("pointermove", pointerMove);doc.addEventListener("pointerup", pointerEnd);doc.addEventListener("pointercancel", pointerEnd);
  doc.addEventListener("touchmove", touchMove, {passive: false});doc.addEventListener("touchend", touchEnd, {passive: false});doc.addEventListener("touchcancel", touchEnd, {passive: false});doc.addEventListener("visibilitychange", visibility);doc.defaultView?.addEventListener("reverie:pause", cancel);
  return () => {
    cancel();element.removeEventListener("pointerdown", pointerStart);element.removeEventListener("touchstart", touchStart);element.removeEventListener("click", click);element.removeEventListener("contextmenu", prevent);
    doc.removeEventListener("pointermove", pointerMove);doc.removeEventListener("pointerup", pointerEnd);doc.removeEventListener("pointercancel", pointerEnd);doc.removeEventListener("touchmove", touchMove);doc.removeEventListener("touchend", touchEnd);doc.removeEventListener("touchcancel", touchEnd);doc.removeEventListener("visibilitychange", visibility);doc.defaultView?.removeEventListener("reverie:pause", cancel);
  };
}
export function bindStick(element: HTMLElement, onAxis: (axis: Axis) => void, onThumb: (point: Axis) => void) {
  const update = (point: Axis) => {const box = element.getBoundingClientRect(), x = point.x - box.x - box.width / 2, y = point.y - box.y - box.height / 2, length = Math.max(1, Math.hypot(x, y) / 30), thumb = {x: x / length, y: y / length};onThumb(thumb);onAxis({x: thumb.x / 30, y: thumb.y / 30});};
  return bindContact(element, {start: update, move: update, end: () => {onThumb({x: 0, y: 0});onAxis({x: 0, y: 0});}});
}
export function bindDirection(element: HTMLElement, axis: Axis, onAxis: (axis: Axis) => void, onHeld: (held: boolean) => void) {
  let began = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {clearTimeout(timer);onAxis({x: 0, y: 0});onHeld(false);};
  const start = () => {clearTimeout(timer);began = clock();onHeld(true);onAxis(axis);};
  const end = (cancelled: boolean) => {const rest = cancelled ? 0 : Math.max(0, 160 - (clock() - began));if (rest) timer = setTimeout(stop, rest);else stop();};
  const unbind = bindContact(element, {start, move: () => {}, end, click: () => {start();timer = setTimeout(stop, 160);}});
  return () => {unbind();stop();};
}
/** Native activation works even while another finger owns movement. */
export function bindTap(element: HTMLElement, activate: () => void) {
  let touch: {id: number; x: number; y: number; cancelled: boolean} | null = null, handled = -Infinity;
  const start = (event: TouchEvent) => {if (touch || disabled(element)) return;const point = event.changedTouches[0];if (point) touch = {id: point.identifier, x: point.clientX, y: point.clientY, cancelled: false};};
  const move = (event: TouchEvent) => {if (!touch) return;const point = findTouch(event.changedTouches, touch.id);if (point && Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 16) touch.cancelled = true;};
  const end = (event: TouchEvent) => {
    if (!touch) return;const point = findTouch(event.changedTouches, touch.id);if (!point) {if (event.type === "touchcancel" && !event.changedTouches.length) {touch = null;handled = clock();}return;}
    const box = element.getBoundingClientRect(), valid = !touch.cancelled && event.type !== "touchcancel" && point.clientX >= box.left && point.clientX <= box.right && point.clientY >= box.top && point.clientY <= box.bottom;
    touch = null;handled = clock();prevent(event);if (valid && !disabled(element)) activate();
  };
  const click = (event: MouseEvent) => {if (clock() - handled >= 500 && !disabled(element)) {prevent(event);activate();}};
  const doc = element.ownerDocument;
  const cancel = () => {touch = null;handled = clock();}, visibility = () => {if (doc.hidden) cancel();};
  doc.addEventListener("visibilitychange", visibility);doc.defaultView?.addEventListener("reverie:pause", cancel);
  element.addEventListener("touchstart", start, {passive: true});element.addEventListener("click", click);doc.addEventListener("touchmove", move, {passive: true});doc.addEventListener("touchend", end, {passive: false});doc.addEventListener("touchcancel", end, {passive: false});
  return () => {element.removeEventListener("touchstart", start);element.removeEventListener("click", click);doc.removeEventListener("touchmove", move);doc.removeEventListener("touchend", end);doc.removeEventListener("touchcancel", end);doc.removeEventListener("visibilitychange", visibility);doc.defaultView?.removeEventListener("reverie:pause", cancel);};
}
export function bindGround(element: HTMLElement, go: (point: Axis) => void) {
  let start: {id: number; x: number; y: number; moved: boolean} | null = null, lastTouch = -Infinity;
  const down = (event: TouchEvent) => {if (isControl(event.target) || start) return;const point = event.changedTouches[0];if (point) start = {id: point.identifier, x: point.clientX, y: point.clientY, moved: false};};
  const move = (event: TouchEvent) => {if (!start) return;const point = findTouch(event.changedTouches, start.id);if (!point) return;prevent(event);if (Math.hypot(point.clientX - start.x, point.clientY - start.y) > 14) start.moved = true;};
  const end = (event: TouchEvent) => {if (!start) return;const point = findTouch(event.changedTouches, start.id);if (!point) {if (event.type === "touchcancel" && !event.changedTouches.length) {start = null;lastTouch = clock();}return;}const valid = !start.moved && event.type !== "touchcancel";start = null;lastTouch = clock();prevent(event);if (valid) go({x: point.clientX, y: point.clientY});};
  const click = (event: MouseEvent) => {if (!isControl(event.target) && clock() - lastTouch >= 500) go({x: event.clientX, y: event.clientY});};
  const doc = element.ownerDocument;
  const cancel = () => {start = null;lastTouch = clock();}, visibility = () => {if (doc.hidden) cancel();};
  doc.addEventListener("visibilitychange", visibility);doc.defaultView?.addEventListener("reverie:pause", cancel);
  element.addEventListener("touchstart", down, {passive: true});element.addEventListener("click", click);doc.addEventListener("touchmove", move, {passive: false});doc.addEventListener("touchend", end, {passive: false});doc.addEventListener("touchcancel", end, {passive: false});
  return () => {element.removeEventListener("touchstart", down);element.removeEventListener("click", click);doc.removeEventListener("touchmove", move);doc.removeEventListener("touchend", end);doc.removeEventListener("touchcancel", end);doc.removeEventListener("visibilitychange", visibility);doc.defaultView?.removeEventListener("reverie:pause", cancel);};
}
