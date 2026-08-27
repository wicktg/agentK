import os
import base64
from PIL import Image

src_path = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/.user_uploaded/media_1787833651670.png"
# Convert to standard RGBA format
img = Image.open(src_path).convert("RGBA")

os.makedirs("public", exist_ok=True)
os.makedirs("src/app", exist_ok=True)

# 1. Save main logo in highest quality
img.save("public/logo.png", "PNG")
img.convert("RGB").save("public/logo.jpg", "JPEG", quality=98)
img.convert("RGB").save("public/about-artwork.jpg", "JPEG", quality=98)

# 2. Generate Favicon & App Icon variations in pure 32-bit RGBA
icon16 = img.resize((16, 16), Image.Resampling.LANCZOS)
icon32 = img.resize((32, 32), Image.Resampling.LANCZOS)
icon48 = img.resize((48, 48), Image.Resampling.LANCZOS)
icon180 = img.resize((180, 180), Image.Resampling.LANCZOS)
icon512 = img.resize((512, 512), Image.Resampling.LANCZOS)

icon16.save("public/favicon-16x16.png", "PNG")
icon32.save("public/favicon-32x32.png", "PNG")
icon32.save("public/favicon.png", "PNG")
icon180.save("public/apple-touch-icon.png", "PNG")
icon180.save("public/apple-icon.png", "PNG")
icon512.save("public/icon-512.png", "PNG")

# App router icons
icon32.save("src/app/icon.png", "PNG")
icon180.save("src/app/apple-icon.png", "PNG")

# Generate standard compliant ICO with RGBA format
icon32.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# Base64 for SVG
with open("public/favicon.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#08090c"/>
  <image href="data:image/png;base64,{b64}" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>
</svg>'''

with open("src/app/icon.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)

with open("public/favicon.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)

print("New official logo and all favicons updated successfully from media_1787833651670.png!")
