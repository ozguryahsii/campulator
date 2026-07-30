"""Campulator marka varlıklarını üretir (pin + çadır + hesap makinesi tuşları)."""
import os
from PIL import Image, ImageDraw

NAVY = (30, 58, 95)
ELEVATED = (18, 35, 56)
BACKGROUND = (8, 19, 31)
PRIMARY = (120, 192, 67)
PRIMARY_BRIGHT = (142, 209, 79)
TEXT = (244, 247, 250)

SS = 4  # supersampling


def draw_logo(size, pad_ratio=0.0, bg=None):
    """viewBox 0 0 100 125 tabanlı logoyu kare tuvale ortalar."""
    S = size * SS
    img = Image.new("RGBA", (S, S), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    inner = S * (1 - 2 * pad_ratio)
    scale = inner / 125.0
    ox = (S - 100 * scale) / 2
    oy = (S - 125 * scale) / 2

    def p(x, y):
        return (ox + x * scale, oy + y * scale)

    def poly(points, fill):
        d.polygon([p(x, y) for x, y in points], fill=fill)

    def pin(inset, fill):
        """Pin silueti: daire + aşağı doğru uç, tek parça."""
        d.ellipse([p(6 + inset, 4 + inset), p(94 - inset, 92 - inset)], fill=fill)
        poly([(20 + inset, 68), (80 - inset, 68), (50, 121 - inset * 1.4)], fill)

    pin(0, ELEVATED)  # ince dış çerçeve
    pin(3, NAVY)  # gövde
    d.ellipse([p(15, 13), p(85, 83)], fill=BACKGROUND)  # iç disk

    # Çadır
    poly([(50, 18), (22, 52), (78, 52)], PRIMARY)
    poly([(50, 18), (36, 52), (64, 52)], PRIMARY_BRIGHT)
    poly([(50, 30), (42, 52), (58, 52)], BACKGROUND)

    # Hesap makinesi tuşları
    r = max(1, int(2 * scale))
    for x, y in ((32, 56), (52, 56), (32, 68), (52, 68)):
        d.rounded_rectangle([p(x, y), p(x + 16, y + 9)], radius=r, fill=TEXT)

    return img.resize((size, size), Image.LANCZOS)


def main():
    out = os.path.join(os.path.dirname(__file__), "brand")
    os.makedirs(out, exist_ok=True)

    # App Store / Play ikonu: opak zemin zorunlu (şeffaflık reddedilir)
    draw_logo(1024, pad_ratio=0.10, bg=BACKGROUND + (255,)).save(f"{out}/icon.png")
    # Android adaptive: güvenli alan için daha fazla boşluk, şeffaf zemin
    draw_logo(1024, pad_ratio=0.22).save(f"{out}/adaptive-icon.png")
    # Splash: şeffaf, ortada
    draw_logo(1024, pad_ratio=0.18).save(f"{out}/splash-icon.png")
    # Uygulama içi logo (şeffaf)
    draw_logo(512, pad_ratio=0.04).save(f"{out}/logo.png")
    # Web favicon
    draw_logo(48, pad_ratio=0.06, bg=BACKGROUND + (255,)).save(f"{out}/favicon.png")
    print("üretildi:", sorted(os.listdir(out)))


main()
