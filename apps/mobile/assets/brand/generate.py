"""
Marka varlıklarını kaynak dosyalardan türetir.

Kaynaklar (tasarımdan gelen, elle güncellenen dosyalar):
  source/icon-art.png    Kare ikon çalışması (opak, köşeleri yuvarlatılmış)
  source/wordmark.png    Pin + "Campulator" yazısı (şeffaf zeminli)

Üretilenler (koda bağlı, elle düzenlenmemeli):
  icon.png, adaptive-icon.png, splash-icon.png, logo.png, favicon.png

Çalıştırma:
  cd apps/mobile/assets/brand && python3 generate.py
"""

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source')

# Tema paleti (src/theme/tokens.ts ile aynı)
BACKGROUND = (8, 19, 31, 255)

# Kaynak ikon çalışmasının köşeleri yuvarlatılmış olduğu için kenarlardan
# bu oranda kırpılır; aksi halde iOS maskesi altında siyah köşeler görünür.
CORNER_TRIM = 0.075


def load(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        raise SystemExit(f'Kaynak dosya yok: {path}')
    return Image.open(path).convert('RGBA')


def trimmed_art():
    """İkon çalışmasını yuvarlak köşelerinden arındırıp kare döner."""
    art = load('icon-art.png')
    w, h = art.size
    dx, dy = int(w * CORNER_TRIM), int(h * CORNER_TRIM)
    art = art.crop((dx, dy, w - dx, h - dy))
    side = min(art.size)
    left = (art.size[0] - side) // 2
    top = (art.size[1] - side) // 2
    return art.crop((left, top, left + side, top + side))


def opaque_square(art, size, scale=1.0):
    """Opak lacivert zemin üzerine ortalanmış kare varlık."""
    canvas = Image.new('RGBA', (size, size), BACKGROUND)
    inner = int(size * scale)
    canvas.alpha_composite(art.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
    return canvas.convert('RGB')


def transparent_square(art, size, scale=1.0):
    """Şeffaf tuval üzerine ortalanmış varlık (adaptif ikon ön katmanı)."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = int(size * scale)
    canvas.alpha_composite(art.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
    return canvas


def alpha_bbox(image, threshold=60):
    """Hafif parlama piksellerini saymadan görünür alanın sınırları."""
    mask = image.getchannel('A').point(lambda v: 255 if v > threshold else 0)
    return mask.getbbox()


def first_gap_column(mask, start):
    """Pin ile yazı arasındaki boş sütun aralığının başlangıcını bulur."""
    px = mask.load()
    width, height = mask.size
    run = 0
    for x in range(start, width):
        empty = all(px[x, y] == 0 for y in range(height))
        run = run + 1 if empty else 0
        if run >= 20:
            return x - run + 1
    return width


def pin_from_wordmark():
    """Wordmark'ın solundaki pini yazıdan ayırıp şeffaf zeminle keser."""
    mark = load('wordmark.png')
    mask = mark.getchannel('A').point(lambda v: 255 if v > 60 else 0)
    box = mask.getbbox()
    if not box:
        raise SystemExit('Wordmark içinde içerik bulunamadı')
    # Yazı pinin hemen sağında başladığı için sabit yarı kesme yetmez
    split = first_gap_column(mask, box[0] + 40)
    pin = mark.crop((box[0], box[1], split, box[3]))

    # Kare tuvale ortala (uygulama içi logo kare kullanılıyor)
    side = max(pin.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.alpha_composite(pin, ((side - pin.size[0]) // 2, (side - pin.size[1]) // 2))
    return square


def main():
    art = trimmed_art()

    # iOS/Android mağaza ikonu: opak, kenardan kenara
    opaque_square(art, 1024).save(os.path.join(HERE, 'icon.png'))

    # Android adaptif ikon: ön katman şeffaf olmalı (zemin app.json'da tanımlı),
    # dış alan kırpılabildiği için pin güvenli alana sığacak şekilde küçültülür
    transparent_square(pin_from_wordmark(), 1024, scale=0.62).save(
        os.path.join(HERE, 'adaptive-icon.png')
    )

    # Web favicon
    opaque_square(art, 64).save(os.path.join(HERE, 'favicon.png'))

    # Pin, şeffaf zeminde. Wordmark'taki "Campulator" yazısı koyu lacivert
    # olduğu için koyu açılış ekranında okunmuyor; splash'te de pin kullanılır.
    pin = pin_from_wordmark()
    pin.resize((1024, 1024), Image.LANCZOS).save(os.path.join(HERE, 'splash-icon.png'))
    pin.resize((512, 512), Image.LANCZOS).save(os.path.join(HERE, 'logo.png'))

    print('Üretildi:', ', '.join(sorted(f for f in os.listdir(HERE) if f.endswith('.png'))))


main()
