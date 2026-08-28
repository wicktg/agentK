from PIL import Image
import numpy as np

img_path = r"C:/Users/hamma/.gemini/antigravity/brain/a8bb4dd1-6435-4bcf-b0a6-1525ce339f12/.user_uploaded/media_1787903671254.jpg"
img = Image.open(img_path)
print("Image size:", img.size)
print("Mode:", img.mode)
print("Aspect ratio:", img.size[0] / img.size[1])

