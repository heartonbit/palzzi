"""
Palzzi Logo Generator
=====================
Generates a 3-strand braided logo (PNG + ICO) using z-buffer rendering.

Usage:
    python scripts/generate_logo.py

Outputs:
    public/logo.png          — 40x40 header logo
    public/favicon.ico       — multi-size favicon (16/32/48)
    public/palzzi_logo.png   — 200x200 source render
"""

from PIL import Image
import math
import os

# --- Config ---
COLORS = [
    (0x17, 0x7E, 0x89),  # Teal
    (0x08, 0x4C, 0x61),  # Dark teal
    (0xDB, 0x3A, 0x34),  # Red
]

W, H = 200, 200
CX, CY = W // 2, H // 2
BRAID_H = 120
AMPLITUDE = 32
STROKE_W = 13
NUM_POINTS = 2000
TWISTS = 1.5
TILT_ANGLE = math.pi / 4  # 45 degrees
PHASES = [0, 2 * math.pi / 3, 4 * math.pi / 3]

LOGO_HEIGHT = 40  # header logo height in px
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def draw_thick_line(zbuf, pixbuf, x1, y1, x2, y2, z, color, width):
    dx = x2 - x1
    dy = y2 - y1
    length = max(math.sqrt(dx * dx + dy * dy), 0.001)
    steps = int(length * 3) + 1
    nx = -dy / length
    ny = dx / length
    hw = width / 2
    for s in range(steps + 1):
        t = s / steps
        px = x1 + dx * t
        py = y1 + dy * t
        for w in range(-int(hw), int(hw) + 1):
            wx = px + nx * w
            wy = py + ny * w
            ix, iy = int(round(wx)), int(round(wy))
            if 0 <= ix < W and 0 <= iy < H:
                dist = abs(w) / hw
                alpha = max(0, 1.0 - dist * dist)
                if alpha > 0.01 and z > zbuf[iy][ix]:
                    zbuf[iy][ix] = z
                    pixbuf[iy][ix] = tuple(int(ch * alpha) for ch in color)


def generate():
    zbuf = [[-2.0] * W for _ in range(H)]
    pixbuf = [[(0, 0, 0, 0)] * W for _ in range(H)]

    twist_rate = TWISTS * 2 * math.pi / BRAID_H
    cos_t = math.cos(TILT_ANGLE)
    sin_t = math.sin(TILT_ANGLE)

    for i in range(3):
        for j in range(NUM_POINTS):
            t1 = j / NUM_POINTS
            t2 = (j + 1) / NUM_POINTS
            ly1 = -BRAID_H / 2 + t1 * BRAID_H
            ly2 = -BRAID_H / 2 + t2 * BRAID_H
            angle1 = PHASES[i] + twist_rate * (ly1 + BRAID_H / 2)
            angle2 = PHASES[i] + twist_rate * (ly2 + BRAID_H / 2)
            lx1 = AMPLITUDE * math.sin(angle1)
            lx2 = AMPLITUDE * math.sin(angle2)
            z1 = math.cos(angle1)
            z2 = math.cos(angle2)
            z_mid = (z1 + z2) / 2

            x1 = CX + lx1 * cos_t - ly1 * sin_t
            y1 = CY + lx1 * sin_t + ly1 * cos_t
            x2 = CX + lx2 * cos_t - ly2 * sin_t
            y2 = CY + lx2 * sin_t + ly2 * cos_t

            brightness = 0.80 + 0.20 * (z_mid + 1) / 2
            c = tuple(int(ch * brightness) for ch in COLORS[i]) + (255,)
            draw_thick_line(zbuf, pixbuf, x1, y1, x2, y2, z_mid, c, STROKE_W)

    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            if zbuf[y][x] > -2.0:
                img.putpixel((x, y), pixbuf[y][x])

    public = os.path.join(ROOT, 'public')
    os.makedirs(public, exist_ok=True)

    # Header logo
    logo_w = int(W * LOGO_HEIGHT / H)
    logo = img.resize((logo_w, LOGO_HEIGHT), Image.LANCZOS)
    logo.save(os.path.join(public, 'logo.png'), 'PNG')

    # Source render
    img.save(os.path.join(public, 'palzzi_logo.png'), 'PNG')

    # Favicon
    favicon = img.resize((32, 32), Image.LANCZOS)
    favicon.save(
        os.path.join(public, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    print(f'logo.png:       {logo_w}x{LOGO_HEIGHT}')
    print(f'palzzi_logo.png: {W}x{H}')
    print(f'favicon.ico:    16/32/48 multi-size')


if __name__ == '__main__':
    generate()
