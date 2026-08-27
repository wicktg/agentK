import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# 1. Canvas Setup (16:9 1920x1080)
W, H = 1920, 1080

# Dark obsidian background with fine linen/paper grain
np.random.seed(42)
noise = np.random.normal(0, 4.0, (H, W, 3)).astype(np.int16)
base_arr = np.full((H, W, 3), [8, 9, 12], dtype=np.int16)
textured_arr = np.clip(base_arr + noise, 0, 255).astype(np.uint8)
canvas_rgb = Image.fromarray(textured_arr).convert("RGBA")

# 2. Smooth Solid-to-Fade Radial Lighting Behind Closed Eye (Right Side)
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

eye_center_x = int(W * 0.74)
eye_center_y = int(H * 0.50)

# Multi-layered smooth solid-to-fade exponential lighting (Subtle Crimson & Electric Rose #E03131 / #9C1428)
for r in range(600, 0, -4):
    t = r / 600
    alpha = int(85 * math.exp(- (r / 260) ** 1.6))
    
    red = int(225 * (1 - t) + 40 * t)
    green = int(45 * (1 - t) + 15 * t)
    blue = int(75 * (1 - t) + 30 * t)
    
    glow_draw.ellipse(
        [eye_center_x - int(r * 1.25), eye_center_y - int(r * 0.82), 
         eye_center_x + int(r * 1.25), eye_center_y + int(r * 0.82)],
        fill=(red, green, blue, alpha)
    )

glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=32))
canvas_rgb = Image.alpha_composite(canvas_rgb, glow_layer)

# 3. High-Resolution Closed Anime Eye Artwork Generation
src_w, src_h = 1200, 800
closed_art = Image.new("RGBA", (src_w, src_h), (255, 255, 255, 255))
d = ImageDraw.Draw(closed_art)

cx, cy = src_w // 2, src_h // 2 + 10

# --- LAYER 1: Upper Eyelid Crease Fold (Elegantly Arched) ---
crease_pts = []
for x in range(260, 920, 3):
    nx = (x - cx) / 330.0
    # Gentle upward curve above eye
    y = cy - 70.0 + 35.0 * (nx ** 2)
    crease_pts.append((x, y))

for i in range(len(crease_pts) - 1):
    nx = abs((crease_pts[i][0] - cx) / 330.0)
    w = max(2, int(6.0 * (1.0 - 0.6 * nx)))
    d.line([crease_pts[i], crease_pts[i + 1]], fill=(50, 45, 55, 220), width=w)

# --- LAYER 2: Main Closed Eyelash Band (Thick, Sweeping Winged Anime Eyeliner) ---
main_lash_pts = []
for x in range(160, 1040, 2):
    nx = (x - cx) / 440.0
    # Downward sweeping closed arc
    y = cy + 40.0 * (1.0 - (nx * 0.88) ** 2)
    if nx > 0.35:
        # Dramatic outer winged lift
        wt = (nx - 0.35) / 0.65
        y -= 52.0 * (wt ** 2.2)
    elif nx < -0.55:
        # Inner corner slight lift
        it = (-nx - 0.55) / 0.45
        y -= 16.0 * (it ** 1.6)
    main_lash_pts.append((x, y))

# Draw main thick tapered eyeliner band
for i in range(len(main_lash_pts) - 1):
    p1 = main_lash_pts[i]
    p2 = main_lash_pts[i + 1]
    nx = (p1[0] - cx) / 440.0
    thickness = int(18.0 * (1.0 - 0.4 * abs(nx)))
    if nx > 0.35:
        thickness = int(18.0 * (1.0 - (nx - 0.35) * 0.6)) + 4
    thickness = max(4, thickness)
    d.line([p1, p2], fill=(12, 12, 18, 255), width=thickness)

# --- LAYER 3: Individual Feathered Closed Lashes (Downward Fluttering) ---
np.random.seed(99)
for x in range(220, 1000, 12):
    nx = (x - cx) / 440.0
    y_base = cy + 40.0 * (1.0 - (nx * 0.88) ** 2)
    if nx > 0.35:
        wt = (nx - 0.35) / 0.65
        y_base -= 52.0 * (wt ** 2.2)
    
    # Lash lengths and angles
    lash_len = 28.0 + 22.0 * abs(nx)
    angle_deg = 80.0 - 45.0 * nx
    angle = math.radians(angle_deg)
    
    dx = math.cos(angle) * lash_len
    dy = math.sin(angle) * lash_len
    
    # Primary lash
    p_end = (x + dx, y_base + dy)
    d.line([(x, y_base), p_end], fill=(15, 15, 22, 250), width=4)
    
    # Secondary fine split lash
    if np.random.rand() > 0.3:
        angle2 = math.radians(angle_deg + (np.random.rand() - 0.5) * 20)
        dx2 = math.cos(angle2) * (lash_len * 0.8)
        dy2 = math.sin(angle2) * (lash_len * 0.8)
        d.line([(x - 3, y_base), (x + dx2 - 3, y_base + dy2)], fill=(30, 25, 35, 220), width=2)

# --- LAYER 4: Outer Wing Accent Spikes (Signature Anime Eyeliner Wing) ---
wing_spikes = [
    ((960, cy - 25), (1055, cy - 65)),
    ((975, cy - 18), (1070, cy - 48)),
    ((990, cy - 8), (1080, cy - 26)),
    ((1000, cy + 5), (1075, cy + 5)),
]
for p_start, p_end in wing_spikes:
    d.line([p_start, p_end], fill=(10, 10, 15, 255), width=4)

# --- LAYER 5: Refined Anime Eyebrow Arch ---
brow_pts = []
for x in range(180, 1020, 3):
    nx = (x - cx) / 420.0
    y = cy - 185.0 + 42.0 * (nx ** 2)
    if nx > 0.25:
        y += 45.0 * ((nx - 0.25) ** 1.7)
    brow_pts.append((x, y))

for i in range(len(brow_pts) - 1):
    nx = abs((brow_pts[i][0] - cx) / 420.0)
    w = max(2, int(9.0 * (1.0 - 0.7 * nx)))
    d.line([brow_pts[i], brow_pts[i + 1]], fill=(35, 30, 40, 240), width=w)

# Soft blur for smooth ASCII rasterization
closed_art = closed_art.filter(ImageFilter.GaussianBlur(radius=1.0))

# 4. Pixel-to-ASCII Rasterizer
target_eye_w = 920
target_eye_h = int(target_eye_w * (src_h / src_w))
eye_resized = closed_art.resize((target_eye_w, target_eye_h), Image.Resampling.LANCZOS)
eye_arr = np.array(eye_resized.convert("RGB"), dtype=np.float32)

cell_w = 4
cell_h = 6
cols = target_eye_w // cell_w
rows = target_eye_h // cell_h

ascii_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ascii_draw = ImageDraw.Draw(ascii_layer)

try:
    font_ascii = ImageFont.truetype("consola.ttf", 8)
except:
    font_ascii = ImageFont.load_default()

glyphs_dark = " .`^:,~+=;!i|()[]{}?I1tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

start_x = eye_center_x - (target_eye_w // 2)
start_y = eye_center_y - (target_eye_h // 2)

for row in range(rows):
    for col in range(cols):
        y0 = row * cell_h
        y1 = min((row + 1) * cell_h, target_eye_h)
        x0 = col * cell_w
        x1 = min((col + 1) * cell_w, target_eye_w)
        
        block = eye_arr[y0:y1, x0:x1]
        if block.size == 0:
            continue
            
        r_avg, g_avg, b_avg = np.mean(block, axis=(0, 1))
        lum = (0.299 * r_avg + 0.587 * g_avg + 0.114 * b_avg) / 255.0
        inv_lum = 1.0 - lum
        inv_lum_boosted = np.clip((inv_lum - 0.04) * 1.9, 0, 1)
        
        norm_x = (x0 - (target_eye_w / 2.0)) / (target_eye_w / 2.0)
        norm_y = (y0 - (target_eye_h / 2.0)) / (target_eye_h / 2.0)
        dist_edge = math.hypot(norm_x * 0.96, norm_y * 1.05)
        fade_mask = max(0.0, min(1.0, 1.0 - (dist_edge ** 2.2)))
        
        if fade_mask > 0.03 and inv_lum_boosted > 0.05:
            char_intensity = inv_lum_boosted
            idx = int(char_intensity * (len(glyphs_dark) - 1))
            char = glyphs_dark[max(0, min(idx, len(glyphs_dark) - 1))]
            
            # Palette mapping: Crisp white core, glowing electric crimson & rose highlights
            if inv_lum_boosted > 0.65:
                # Core thick lashes & wing
                color = (255, 255, 255, int(255 * fade_mask))
            elif inv_lum_boosted > 0.40:
                # Flutter lashes & eyeliner sweep
                color = (255, 105, 130, int(245 * fade_mask))
            elif inv_lum_boosted > 0.18:
                # Eyelid crease & brow
                color = (225, 45, 75, int(215 * fade_mask))
            else:
                # Ambient contour
                color = (150, 30, 50, int(150 * fade_mask))
                
            pos_x = start_x + x0
            pos_y = start_y + y0
            
            if color[3] > 8 and char != ' ':
                ascii_draw.text((pos_x, pos_y), char, font=font_ascii, fill=color)

canvas_rgb = Image.alpha_composite(canvas_rgb, ascii_layer)

# 5. Render Foreground Typography
try:
    serif_font = ImageFont.truetype("georgia.ttf", 68)
except:
    serif_font = ImageFont.load_default()

try:
    script_font = ImageFont.truetype("C:\\Windows\\Fonts\\segoesc.ttf", 116)
except:
    try:
        script_font = ImageFont.truetype("C:\\Windows\\Fonts\\palabi.ttf", 100)
    except:
        script_font = serif_font

text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
text_draw = ImageDraw.Draw(text_layer)

line1 = "Your Contribution Has Been"
line2 = "Rejected"

text_x = int(W * 0.08)
text_y1 = int(H * 0.40)
text_y2 = int(H * 0.50)

# Soft typographic drop shadow
shadow_offset = 3
text_draw.text((text_x + shadow_offset, text_y1 + shadow_offset), line1, font=serif_font, fill=(0, 0, 0, 180))
text_draw.text((text_x + shadow_offset, text_y2 + shadow_offset + 4), line2, font=script_font, fill=(0, 0, 0, 180))

# Foreground high-contrast clean typography
text_draw.text((text_x, text_y1), line1, font=serif_font, fill=(255, 255, 255, 255))
text_draw.text((text_x, text_y2), line2, font=script_font, fill=(255, 240, 242, 255))

canvas_rgb = Image.alpha_composite(canvas_rgb, text_layer)

# 6. Save Banner
out_path_public = "public/contribution-rejected-banner.png"
out_path_artifact = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/contribution_rejected_ascii.png"

canvas_rgb.save(out_path_public, "PNG")
canvas_rgb.save(out_path_artifact, "PNG")
print("Enhanced ultra-sharp closed-eye rejected banner generated successfully!")

