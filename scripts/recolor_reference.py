import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

def apply_brand_styling_to_reference(
    ref_path=r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/.user_uploaded/media_1787903671254.jpg",
    target_width=2500,
    target_height=1000,
    output_path="public/brand-particle-terrain-5x2.png",
    artifact_path="brand_particle_terrain_5x2.png"
):
    print(f"Applying brand styling to reference image into 5:2 ({target_width}x{target_height})...")
    
    # 1. Load reference image as grayscale
    ref_img = Image.open(ref_path).convert("L")
    
    # 2. Resize with Lanczos interpolation to target 5:2 aspect ratio
    # 5:2 is 2.5:1 ratio (2500x1000)
    resized_l = ref_img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Increase sharpness and contrast to preserve crisp halftone dots
    enhancer = ImageEnhance.Contrast(resized_l)
    contrast_l = enhancer.enhance(1.25)
    
    arr = np.array(contrast_l, dtype=np.float32) / 255.0
    
    # 3. Create Color Mapping Arrays (RGBA)
    # Background: #08090c -> (8, 9, 12)
    # Dark Shadows: #0b303d -> (11, 48, 61)
    # Brand Cyan: #17A2C6 -> (23, 162, 198)
    # Peak Aqua: #70e3fa -> (112, 227, 250)
    # Highlight: #e6faff -> (230, 250, 255)
    
    h, w = arr.shape
    out_rgb = np.zeros((h, w, 3), dtype=np.float32)
    
    # Base background #08090c
    bg_r, bg_g, bg_b = 8.0, 9.0, 12.0
    
    # Apply piecewise smooth color gradient mapping
    # Mask 1: Low values (background to shadow)
    m1 = arr < 0.25
    t1 = np.clip(arr / 0.25, 0.0, 1.0)
    out_rgb[m1, 0] = bg_r + (11.0 - bg_r) * t1[m1]
    out_rgb[m1, 1] = bg_g + (48.0 - bg_g) * t1[m1]
    out_rgb[m1, 2] = bg_b + (61.0 - bg_b) * t1[m1]
    
    # Mask 2: Mid-low values (shadow to brand #17A2C6)
    m2 = (arr >= 0.25) & (arr < 0.65)
    t2 = np.clip((arr - 0.25) / 0.40, 0.0, 1.0)
    out_rgb[m2, 0] = 11.0 + (23.0 - 11.0) * t2[m2]
    out_rgb[m2, 1] = 48.0 + (162.0 - 48.0) * t2[m2]
    out_rgb[m2, 2] = 61.0 + (198.0 - 61.0) * t2[m2]
    
    # Mask 3: High values (brand #17A2C6 to luminous peak highlight #e6faff)
    m3 = arr >= 0.65
    t3 = np.clip((arr - 0.65) / 0.35, 0.0, 1.0)
    out_rgb[m3, 0] = 23.0 + (230.0 - 23.0) * (t3[m3] ** 1.2)
    out_rgb[m3, 1] = 162.0 + (250.0 - 162.0) * (t3[m3] ** 1.2)
    out_rgb[m3, 2] = 198.0 + (255.0 - 198.0) * (t3[m3] ** 1.2)
    
    # Convert to PIL Image
    out_img = Image.fromarray(np.uint8(np.clip(out_rgb, 0, 255)))
    
    # 4. Add subtle luminous cyan bloom on high crests
    # Extract highlights
    peaks_mask = np.clip((arr - 0.70) / 0.30, 0.0, 1.0)
    glow_arr = np.zeros((h, w, 3), dtype=np.float32)
    glow_arr[:, :, 0] = 23.0 * peaks_mask
    glow_arr[:, :, 1] = 162.0 * peaks_mask
    glow_arr[:, :, 2] = 198.0 * peaks_mask
    
    glow_img = Image.fromarray(np.uint8(glow_arr)).filter(ImageFilter.GaussianBlur(radius=6))
    
    # Blend base with subtle glow
    final_img = Image.blend(out_img, Image.fromarray(np.uint8(np.clip(np.array(out_img, dtype=np.float32) + np.array(glow_img, dtype=np.float32) * 0.45, 0, 255))), alpha=0.85)

    # 5. Save outputs
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_img.save(output_path, "PNG", quality=95)
    print(f"[OK] Saved to {output_path}")
    
    brain_dir = r"C:\Users\hamma\.gemini\antigravity\brain\a8bb4dd1-6435-4bcf-b0a6-1525ce339f12"
    artifact_full_path = os.path.join(brain_dir, artifact_path)
    final_img.save(artifact_full_path, "PNG", quality=95)
    print(f"[OK] Saved artifact to {artifact_full_path}")

if __name__ == "__main__":
    apply_brand_styling_to_reference()

