import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# 1. Canvas Setup (16:9 1920x1080)
W, H = 1920, 1080

# Dark obsidian background with fine linen/paper grain
np.random.seed(42)
noise = np.random.normal(0, 4.0, (H, W, 3)).astype(np.int16)
base_arr = np.full((H, W, 3), [8, 9, 12], dtype=np.int16)
textured_arr = np.clip(base_arr + noise, 0, 255).astype(np.uint8)
canvas_rgb = Image.fromarray(textured_arr).convert("RGBA")

# 2. Smooth Solid-to-Fade Radial Lighting Behind Eye (Right Side)
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

eye_center_x = int(W * 0.74)
eye_center_y = int(H * 0.50)

# Multi-layered smooth solid-to-fade exponential lighting (Cyan #17A2C6 + Electric Teal)
for r in range(580, 0, -4):
    t = r / 580
    alpha = int(85 * math.exp(- (r / 250) ** 1.6))
    
    red = int(23 * (1 - t) + 10 * t)
    green = int(185 * (1 - t) + 35 * t)
    blue = int(225 * (1 - t) + 80 * t)
    
    glow_draw.ellipse(
        [eye_center_x - int(r * 1.20), eye_center_y - int(r * 0.78), 
         eye_center_x + int(r * 1.20), eye_center_y + int(r * 0.78)],
        fill=(red, green, blue, alpha)
    )

glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=32))
canvas_rgb = Image.alpha_composite(canvas_rgb, glow_layer)

# 3. Direct Pixel-to-ASCII Mapping of the Exact Source Image
eye_src = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/.user_uploaded/media_1787841992113.png"
raw_img = Image.open(eye_src).convert("RGB")

# Enhance contrast and sharpness of the source eye
enhancer_c = ImageEnhance.Contrast(raw_img)
enhanced_eye = enhancer_c.enhance(1.45)
enhancer_s = ImageEnhance.Sharpness(enhanced_eye)
enhanced_eye = enhancer_s.enhance(1.8)

target_eye_w = 860
target_eye_h = int(target_eye_w * (raw_img.height / raw_img.width))
eye_resized = enhanced_eye.resize((target_eye_w, target_eye_h), Image.Resampling.LANCZOS)
eye_arr = np.array(eye_resized, dtype=np.float32)

# High-resolution ASCII rendering grid
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
        
        # Calculate perceived brightness in source (0 to 1)
        lum = (0.299 * r_avg + 0.587 * g_avg + 0.114 * b_avg) / 255.0
        
        # Invert so dark eyelashes and pupils become glowing
        inv_lum = 1.0 - lum
        
        # Boost contrast of structure
        inv_lum_boosted = np.clip((inv_lum - 0.15) * 1.5, 0, 1)
        
        # Detect specular white highlight dots in source
        cx = target_eye_w / 2.0
        cy = target_eye_h / 2.0
        dist_c = math.hypot((x0 - cx) / 130.0, (y0 - cy) / 110.0)
        is_specular = (r_avg > 230 and g_avg > 225 and b_avg > 225 and dist_c < 1.1)
        is_red_pupil = (r_avg > 150 and g_avg < 85 and b_avg < 95 and dist_c < 0.5)
        
        # Edge fade mask
        norm_x = (x0 - (target_eye_w / 2.0)) / (target_eye_w / 2.0)
        norm_y = (y0 - (target_eye_h / 2.0)) / (target_eye_h / 2.0)
        dist_edge = math.hypot(norm_x * 0.96, norm_y * 1.05)
        fade_mask = max(0.0, min(1.0, 1.0 - (dist_edge ** 2.2)))
        
        if fade_mask > 0.04 and inv_lum_boosted > 0.05:
            char_intensity = inv_lum_boosted
            if is_specular:
                char_intensity = 1.0
                
            idx = int(char_intensity * (len(glyphs_dark) - 1))
            char = glyphs_dark[max(0, min(idx, len(glyphs_dark) - 1))]
            
            # Glowing palette mapping
            if is_specular:
                color = (255, 255, 255, 255)
            elif is_red_pupil:
                color = (255, 75, 130, 250)
            elif inv_lum_boosted > 0.60:
                # Eyelashes & thick eyeliner lines
                color = (255, 255, 255, int(255 * fade_mask))
            elif inv_lum_boosted > 0.35:
                # Winged lashes & iris ring
                color = (48, 230, 255, int(245 * fade_mask))
            elif inv_lum_boosted > 0.18:
                # Iris shading, crease, and hair strands
                color = (23, 162, 198, int(215 * fade_mask))
            else:
                # Ambient eyelid contour
                color = (16, 115, 145, int(150 * fade_mask))
                
            pos_x = start_x + x0
            pos_y = start_y + y0
            
            if color[3] > 8 and char != ' ':
                ascii_draw.text((pos_x, pos_y), char, font=font_ascii, fill=color)

canvas_rgb = Image.alpha_composite(canvas_rgb, ascii_layer)

# 4. Render Foreground Typography
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
line2 = "Recorded"

text_x = int(W * 0.08)
text_y1 = int(H * 0.40)
text_y2 = int(H * 0.50)

# Soft typographic drop shadow
shadow_offset = 3
text_draw.text((text_x + shadow_offset, text_y1 + shadow_offset), line1, font=serif_font, fill=(0, 0, 0, 180))
text_draw.text((text_x + shadow_offset, text_y2 + shadow_offset + 4), line2, font=script_font, fill=(0, 0, 0, 180))

# Foreground high-contrast clean typography
text_draw.text((text_x, text_y1), line1, font=serif_font, fill=(255, 255, 255, 255))
text_draw.text((text_x, text_y2), line2, font=script_font, fill=(250, 252, 255, 255))

canvas_rgb = Image.alpha_composite(canvas_rgb, text_layer)

# 5. Output Final Banner
out_path_public = "public/contribution-recorded-banner.png"
out_path_artifact = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/contribution_recorded_ascii.png"

canvas_rgb.save(out_path_public, "PNG")
canvas_rgb.save(out_path_artifact, "PNG")
print("Enhanced ultra-sharp ASCII eye banner generated successfully!")
