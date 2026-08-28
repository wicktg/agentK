import math
import numpy as np
from PIL import Image, ImageDraw

def create_brand_particle_terrain(
    width=2500,
    height=1000,
    output_path="public/brand-particle-terrain-5x2.png",
    artifact_path="brand_particle_terrain_5x2.png"
):
    print(f"Rendering master 5:2 Particle Terrain Art ({width}x{height})...")
    
    # 1. Base Canvas: Obsidian Void #08090c
    img = Image.new("RGBA", (width, height), (8, 9, 12, 255))
    draw = ImageDraw.Draw(img)

    # 2. Dense Grid Setup (Horizontal scanning contour waves)
    n_rows = 170     # depth slices
    n_cols = 360     # points along each wave line
    
    x_arr = np.linspace(-7.0, 7.0, n_cols)
    y_arr = np.linspace(0.0, 5.8, n_rows) # 0 = foreground bottom, 5.8 = background horizon
    
    scale_x = width / 13.5
    scale_y = (height * 0.78) / 5.8
    scale_z = height * 0.25
    
    y_offset = height * 0.95
    x_offset = width * 0.50
    
    all_points = []
    
    for j, y_val in enumerate(y_arr):
        for i, x_val in enumerate(x_arr):
            # Rich multi-harmonic topography
            w1 = 1.10 * np.sin(0.72 * x_val + 0.35 * y_val) * np.cos(0.55 * y_val - 0.25 * x_val)
            w2 = 0.60 * np.sin(1.55 * x_val - 0.75 * y_val + 0.6) * np.cos(1.05 * x_val + 0.38 * y_val)
            
            # Mountain crests
            peak_r = 1.50 * np.exp(-((x_val - 3.2)**2 + (y_val - 4.4)**2) / 3.6) # high right peak
            peak_l = 1.40 * np.exp(-((x_val + 3.0)**2 + (y_val - 1.6)**2) / 3.4) # left foreground crest
            peak_c = 1.20 * np.exp(-((x_val - 0.4)**2 + (y_val - 3.0)**2) / 2.8) # center midground ridge
            peak_bg = 1.30 * np.exp(-((x_val + 1.4)**2 + (y_val - 5.0)**2) / 4.2) # background hill
            
            # Textured ripple harmonics
            ripple = 0.15 * np.sin(3.8 * x_val + 1.9 * y_val) * np.cos(2.4 * x_val - 1.2 * y_val)
            
            z_val = w1 + w2 + peak_r + peak_l + peak_c + peak_bg + ripple
            
            all_points.append((x_val, y_val, z_val, i, j))
            
    # Sort back-to-front (largest y_val drawn first for correct occlusion)
    all_points.sort(key=lambda p: -p[1])
    
    # Elevation range
    z_values = [p[2] for p in all_points]
    min_z = min(z_values)
    max_z = max(z_values)
    z_range = max_z - min_z if max_z > min_z else 1.0
    
    # 3. Render Crisp Particle Halftone Matrix
    for x_val, y_val, z_val, i, j in all_points:
        # Perspective compression
        depth_ratio = 1.0 - (y_val / 7.2)
        px = x_offset + (x_val * scale_x * (0.76 + 0.24 * depth_ratio))
        py = y_offset - (y_val * scale_y) - (z_val * scale_z)
        
        if not (-20 <= px <= width + 20 and -20 <= py <= height + 20):
            continue
            
        norm_h = (z_val - min_z) / z_range
        norm_h = max(0.0, min(1.0, norm_h))
        
        depth_factor = 1.0 - (y_val / 5.8)
        depth_factor = max(0.25, min(1.0, depth_factor))
        
        # Crisp dot sizing
        base_r = 0.85 + 2.15 * (norm_h ** 1.35) * (depth_factor ** 0.45)
        
        # Color mapping: Brand #17A2C6 theme
        if norm_h < 0.32:
            # Valleys & shadows (#082029)
            t = norm_h / 0.32
            r = int(7 + (23 - 7) * t)
            g = int(18 + (90 - 18) * t)
            b = int(28 + (140 - 28) * t)
            alpha = int(80 + 100 * t * depth_factor)
        elif norm_h < 0.72:
            # Slopes (Brand Cyan #17A2C6)
            t = (norm_h - 0.32) / 0.40
            r = int(23 + (75 - 23) * t)
            g = int(90 + (210 - 90) * t)
            b = int(140 + (248 - 140) * t)
            alpha = int(180 + 75 * t)
        else:
            # Luminous crest highlights (#d8f8ff / pure white-cyan)
            t = (norm_h - 0.72) / 0.28
            r = int(75 + (242 - 75) * t)
            g = int(210 + (255 - 210) * t)
            b = int(248 + (255 - 248) * t)
            alpha = 255
            
        # Soft outer glow on illuminated peaks
        if norm_h > 0.70 and base_r > 1.8:
            glow_r = base_r * 1.6
            glow_alpha = int(alpha * 0.24)
            draw.ellipse(
                [px - glow_r, py - glow_r, px + glow_r, py + glow_r],
                fill=(23, 162, 198, glow_alpha)
            )
            
        # Core solid particle
        draw.ellipse(
            [px - base_r, py - base_r, px + base_r, py + base_r],
            fill=(r, g, b, alpha)
        )

    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG", quality=95)
    print(f"[OK] Saved to {output_path}")
    
    brain_dir = r"C:\Users\hamma\.gemini\antigravity\brain\a8bb4dd1-6435-4bcf-b0a6-1525ce339f12"
    artifact_full_path = os.path.join(brain_dir, artifact_path)
    img.save(artifact_full_path, "PNG", quality=95)
    print(f"[OK] Saved artifact to {artifact_full_path}")

if __name__ == "__main__":
    create_brand_particle_terrain()
