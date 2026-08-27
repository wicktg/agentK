import os
from PIL import Image, ImageDraw, ImageFont

def generate_ascii():
    input_path = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/.user_uploaded/media_1787769953494.jpg"
    img = Image.open(input_path).convert("RGB")
    orig_w, orig_h = img.size

    # Monospace font setup
    font_path = "C:/Windows/Fonts/consola.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/cour.ttf"

    font_size = 14
    font = ImageFont.truetype(font_path, font_size)

    # ASCII density ramp
    ASCII_CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

    # 160 columns for ultra crisp facial detail
    cols = 160
    char_w = 8.5
    char_h = 14

    rows = int(cols * (orig_h / orig_w) * (char_w / char_h))

    resized = img.resize((cols, rows), Image.Resampling.LANCZOS)
    gray = resized.convert("L")

    out_w = int(cols * char_w)
    out_h = int(rows * char_h)

    # 1. FULL COLOR ASCII (NO BLUR, NO FILTER, CRISP PIXEL-SHARP COLOR)
    color_img = Image.new("RGB", (out_w, out_h), color="#08090c")
    draw_color = ImageDraw.Draw(color_img)

    # 2. CYAN BRANDED ASCII
    cyan_img = Image.new("RGB", (out_w, out_h), color="#08090c")
    draw_cyan = ImageDraw.Draw(cyan_img)

    for r in range(rows):
        for c in range(cols):
            lum = gray.getpixel((c, r))
            rgb = resized.getpixel((c, r))

            char_idx = int((lum / 255) * (len(ASCII_CHARS) - 1))
            char = ASCII_CHARS[char_idx]

            x = c * char_w
            y = r * char_h

            if char != " ":
                # Exact, crisp, unblurred character rendering with original color
                draw_color.text((x, y), char, font=font, fill=rgb)

                # Cyan version
                norm_lum = lum / 255.0
                if norm_lum > 0.85:
                    cyan_color = (255, 255, 255)
                elif norm_lum > 0.6:
                    cyan_color = (87, 206, 233)
                elif norm_lum > 0.35:
                    cyan_color = (23, 162, 198)
                elif norm_lum > 0.15:
                    cyan_color = (18, 100, 125)
                else:
                    cyan_color = (10, 50, 65)
                draw_cyan.text((x, y), char, font=font, fill=cyan_color)

    os.makedirs("public", exist_ok=True)
    os.makedirs("public/ascii-art", exist_ok=True)

    # Save to public directory
    color_img.save("public/about-artwork.jpg", "JPEG", quality=98)
    color_img.save("public/ascii-portrait-color.png", "PNG", quality=98)
    cyan_img.save("public/ascii-portrait.png", "PNG", quality=98)

    # Save to brain artifact directory as well
    artifact_dir = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12"
    color_img.save(os.path.join(artifact_dir, "ascii-portrait-color.png"), "PNG", quality=98)
    cyan_img.save(os.path.join(artifact_dir, "ascii-portrait.png"), "PNG", quality=98)

    print(f"Reverted and generated successfully: {out_w}x{out_h}")

if __name__ == "__main__":
    generate_ascii()
