import os
import json
import math
from PIL import Image

def generate_points():
    img_path = "apps/web/public/textures/earth_specular.jpg"
    img = Image.open(img_path).convert("L")
    w, h = img.size
    pixels = img.load()

    num_samples = 40000
    land_coords = []
    
    # Fibonacci sphere generation for uniform distribution
    phi = math.pi * (math.sqrt(5.0) - 1.0) # golden ratio angle
    radius = 1.83

    for i in range(num_samples):
        y = 1.0 - (i / float(num_samples - 1)) * 2.0  # y goes from 1 to -1
        radius_at_y = math.sqrt(max(0.0, 1.0 - y * y))
        theta = phi * i

        x = math.cos(theta) * radius_at_y
        z = math.sin(theta) * radius_at_y

        # Convert 3D Cartesian to UV
        lat = math.asin(max(-1.0, min(1.0, y)))
        lon = math.atan2(z, x)

        u = (lon / (2.0 * math.pi)) + 0.5
        v = 0.5 - (lat / math.pi)

        px = int(max(0, min(w - 1, u * (w - 1))))
        py = int(max(0, min(h - 1, v * (h - 1))))

        brightness = pixels[px, py]

        # Land has low brightness (< 50)
        if brightness < 60:
            # Round coordinates to 3 decimal places to keep JSON compact
            land_coords.append(round(x * radius, 3))
            land_coords.append(round(y * radius, 3))
            land_coords.append(round(z * radius, 3))

    total_points = len(land_coords) // 3
    print(f"Generated {total_points} authentic land points.")

    out_dir = "apps/web/public/data"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "earth_land_points.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(land_coords, f)

    file_size_kb = os.path.getsize(out_path) / 1024
    print(f"Saved to {out_path} ({file_size_kb:.1f} KB)")

if __name__ == "__main__":
    generate_points()
