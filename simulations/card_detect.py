#!/usr/bin/env python3
"""Card-quad detection — the reference implementation behind web/src/scan/locate.worker.js.

Multi-strategy binarization -> contours -> convex quads scored by rectangularity x
5:7-aspect x side-symmetry; container/dedupe cleanup; per-side gradient line-fit
refinement; perspective rectification. Rotation-agnostic. Validated 2026-07-02 on real
photos (binder page, table singles, sleeves, rotation). Lives in the repo because the
scratchpad copy got wiped once already — this is the scanner's regression harness.
"""
import cv2
import numpy as np

CARD_ASPECT = 5.0 / 7.0
WORK = 1600


def _order_quad(q):
    q = q.reshape(4, 2).astype(np.float64)
    c = q.mean(axis=0)
    ang = np.arctan2(q[:, 1] - c[1], q[:, 0] - c[0])
    q = q[np.argsort(ang)]
    return np.roll(q, -int(np.argmin(q.sum(axis=1))), axis=0)


def _sides(q):
    return [np.linalg.norm(q[i] - q[(i + 1) % 4]) for i in range(4)]


def _aspect_score(q):
    s = _sides(q)
    a, b = (s[0] + s[2]) / 2.0, (s[1] + s[3]) / 2.0
    if a <= 1 or b <= 1:
        return 0.0
    r = min(a, b) / max(a, b)
    if r < 0.52 or r > 0.95:
        return 0.0
    return float(np.exp(-((r - CARD_ASPECT) ** 2) / (2 * 0.09 ** 2)))


def _rectangularity(q):
    area = cv2.contourArea(q.astype(np.float32))
    rr = cv2.minAreaRect(q.astype(np.float32))
    ra = rr[1][0] * rr[1][1]
    return float(area / ra) if ra > 0 else 0.0


def _opposite(q):
    s = _sides(q)
    r1 = min(s[0], s[2]) / max(s[0], s[2]) if max(s[0], s[2]) else 0
    r2 = min(s[1], s[3]) / max(s[1], s[3]) if max(s[1], s[3]) else 0
    return float(r1 * r2)


def _score(q):
    return _rectangularity(q) * _aspect_score(q) * _opposite(q)


def _quad_from_contour(c):
    hull = cv2.convexHull(c)
    peri = cv2.arcLength(hull, True)
    for f in (0.02, 0.03, 0.05, 0.08):
        ap = cv2.approxPolyDP(hull, f * peri, True)
        if len(ap) == 4 and cv2.isContourConvex(ap):
            return _order_quad(ap)
    return _order_quad(cv2.boxPoints(cv2.minAreaRect(c)))


def _strategies(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.GaussianBlur(gray, (5, 5), 0)
    k3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    k5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    out = []
    e1 = cv2.Canny(g, 40, 120)
    out.append(cv2.morphologyEx(e1, cv2.MORPH_CLOSE, k5))
    e2 = cv2.Canny(g, 15, 60)
    out.append(cv2.morphologyEx(e2, cv2.MORPH_CLOSE, k3))
    _, t1 = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    out.append(cv2.morphologyEx(t1, cv2.MORPH_OPEN, k5))
    out.append(cv2.morphologyEx(255 - t1, cv2.MORPH_OPEN, k5))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    s = cv2.GaussianBlur(hsv[:, :, 1], (5, 5), 0)
    _, st = cv2.threshold(s, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    out.append(cv2.morphologyEx(st, cv2.MORPH_OPEN, k5))
    return out


def _quad_iou(q1, q2):
    inter, _ = cv2.intersectConvexConvex(q1.astype(np.float32), q2.astype(np.float32))
    a1 = cv2.contourArea(q1.astype(np.float32))
    a2 = cv2.contourArea(q2.astype(np.float32))
    u = a1 + a2 - inter
    return float(inter / u) if u > 0 else 0.0


def detect_quads(img, min_frac=0.008, max_frac=0.88, min_score=0.35):
    H, W = img.shape[:2]
    sc = WORK / max(H, W) if max(H, W) > WORK else 1.0
    work = cv2.resize(img, (int(W * sc), int(H * sc))) if sc < 1.0 else img
    h, w = work.shape[:2]
    A = float(h * w)
    cands = []
    for bm in _strategies(work):
        cnts, _ = cv2.findContours(bm, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            a = cv2.contourArea(c)
            if a < min_frac * A or a > max_frac * A:
                continue
            q = _quad_from_contour(c)
            s = _score(q)
            if s >= min_score:
                cands.append((q, float(s)))
    # container rejection: holds >=2 DISTINCT strong candidates -> group blob, not a card
    centers = [np.mean(q, axis=0) for q, _ in cands]
    keep = []
    for i, (q, s) in enumerate(cands):
        inside = 0
        qf = q.astype(np.float32)
        for j, c in enumerate(centers):
            if i == j or cands[j][1] < 0.6:
                continue
            if _quad_iou(q, cands[j][0]) >= 0.3:
                continue
            if cv2.pointPolygonTest(qf, (float(c[0]), float(c[1])), False) >= 0:
                inside += 1
        keep.append(inside < 2)
    cands = [cs for cs, k in zip(cands, keep) if k]
    # dedupe; prefer the LARGER quad when both plausible (full card beats its art frame)
    cands.sort(key=lambda t: -t[1])
    kept = []
    for q, s in cands:
        placed = False
        for ki, (kq, ks) in enumerate(kept):
            if _quad_iou(q, kq) >= 0.45:
                if cv2.contourArea(q.astype(np.float32)) > cv2.contourArea(kq.astype(np.float32)) * 1.15 and s >= 0.5 * ks:
                    kept[ki] = (q, s)
                placed = True
                break
        if not placed:
            kept.append((q, s))
    return [(q / sc, s) for q, s in kept]


def refine_quad(img, quad, band=8, samples=24):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    mag = cv2.magnitude(gx, gy)
    H, W = mag.shape
    q = _order_quad(quad.copy())
    size = np.sqrt(cv2.contourArea(q.astype(np.float32)))
    lines = []
    for i in range(4):
        p0, p1 = q[i], q[(i + 1) % 4]
        d = p1 - p0
        L = np.linalg.norm(d)
        if L < 8:
            return quad
        u = d / L
        n = np.array([-u[1], u[0]])
        pts = []
        for t in np.linspace(0.12, 0.88, samples):
            base = p0 + d * t
            best, bo = -1.0, 0.0
            for o in np.linspace(-band, band, 2 * band + 1):
                x, y = base + n * o
                xi, yi = int(round(x)), int(round(y))
                if 0 <= xi < W and 0 <= yi < H and mag[yi, xi] > best:
                    best, bo = float(mag[yi, xi]), float(o)
            pts.append(base + n * bo)
        pts = np.array(pts)
        c = pts.mean(axis=0)
        d2 = pts - c
        evals, evecs = np.linalg.eigh(d2.T @ d2)
        lines.append((c, evecs[:, np.argmax(evals)]))
    corners = []
    for i in range(4):
        (c1, d1), (c2, d2v) = lines[(i - 1) % 4], lines[i]
        Amat = np.array([[d1[0], -d2v[0]], [d1[1], -d2v[1]]])
        if abs(np.linalg.det(Amat)) < 1e-9:
            return quad
        t = np.linalg.solve(Amat, c2 - c1)
        corners.append(c1 + d1 * t[0])
    newq = _order_quad(np.array(corners))
    if np.abs(newq - q).max() > 0.06 * size + 4:
        return quad
    return newq


def rectify(img, quad, out_w=500, out_h=700):
    q = _order_quad(quad.copy()).astype(np.float32)
    s = _sides(q)
    if (s[0] + s[2]) / 2.0 > (s[1] + s[3]) / 2.0:
        q = np.roll(q, -1, axis=0)
    dst = np.array([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(q, dst)
    return cv2.warpPerspective(img, M, (out_w, out_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def quad_for_box(img, box, pad=0.16):
    """Best card quad inside one padded ROI (box: fractions). None if nothing scores."""
    H, W = img.shape[:2]
    bw, bh = box[2] - box[0], box[3] - box[1]
    x0 = max(0, int((box[0] - bw * pad) * W)); y0 = max(0, int((box[1] - bh * pad) * H))
    x1 = min(W, int((box[2] + bw * pad) * W)); y1 = min(H, int((box[3] + bh * pad) * H))
    if x1 - x0 < 40 or y1 - y0 < 40:
        return None
    roi = img[y0:y1, x0:x1]
    rh, rw = roi.shape[:2]
    sc = 720.0 / max(rh, rw) if max(rh, rw) > 720 else 1.0
    work = cv2.resize(roi, (int(rw * sc), int(rh * sc))) if sc < 1.0 else roi
    wa = float(work.shape[0] * work.shape[1])
    best, bs = None, 0.0
    for bm in _strategies(work):
        cnts, _ = cv2.findContours(bm, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            a = cv2.contourArea(c)
            if a < 0.22 * wa or a > 0.98 * wa:
                continue
            q = _quad_from_contour(c)
            s2 = _score(q)
            if s2 > bs:
                best, bs = q, s2
    if best is None or bs < 0.45:
        return None
    return best / sc + np.array([x0, y0], dtype=np.float64)


def crop_cards(img, boxes):
    """One quad per box: local CV quad (refined) or the refined box itself."""
    H, W = img.shape[:2]
    out = []
    for b in boxes:
        q = quad_for_box(img, b)
        if q is None:
            q = np.array([[b[0] * W, b[1] * H], [b[2] * W, b[1] * H],
                          [b[2] * W, b[3] * H], [b[0] * W, b[3] * H]])
            out.append(refine_quad(img, q, band=22, samples=28))
        else:
            out.append(refine_quad(img, q))
    return out
