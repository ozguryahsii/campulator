# Marka Görselleri

## Nasıl güncellenir

Tasarımdan gelen dosyalar **`source/` klasörüne** konur; kullanılan varlıklar
`generate.py` ile bunlardan türetilir. Kök klasördeki PNG'ler üretim çıktısıdır,
elle düzenlenmemelidir.

| Kaynak dosya           | İçerik                                              |
| ---------------------- | --------------------------------------------------- |
| `source/icon-art.png`  | Kare ikon çalışması (opak zemin, köşeler yuvarlak)  |
| `source/wordmark.png`  | Pin + "Campulator" yazısı, **şeffaf zeminli**       |

```bash
# yeni tasarım dosyalarını yerleştir
cp ~/Desktop/yeni-ikon.png     apps/mobile/assets/brand/source/icon-art.png
cp ~/Desktop/yeni-wordmark.png apps/mobile/assets/brand/source/wordmark.png

# varlıkları yeniden üret (Pillow gerekir: pip install pillow)
cd apps/mobile/assets/brand && python3 generate.py
```

Sonrasında Metro'yu `--clear` ile yeniden başlatın.

## Üretilen dosyalar

| Dosya               | Kullanım                            | Boyut     | Zemin  |
| ------------------- | ----------------------------------- | --------- | ------ |
| `icon.png`          | iOS/Android uygulama ikonu          | 1024×1024 | Opak   |
| `adaptive-icon.png` | Android adaptif ikon ön katmanı     | 1024×1024 | Şeffaf |
| `splash-icon.png`   | Açılış ekranı görseli               | 1024×1024 | Şeffaf |
| `logo.png`          | Uygulama içi logo (`BrandLogo.tsx`) | 512×512   | Şeffaf |
| `favicon.png`       | Web favicon                         | 64×64     | Opak   |

Bunlar `app.json` içindeki `icon`, `splash.image`, `android.adaptiveIcon` ve
`web.favicon` alanlarına bağlıdır; dosya adları değişmediği sürece `app.json`
düzenlenmez.

## Üretim kuralları (neden ham dosyalar doğrudan kullanılmıyor)

- **iOS ikonu şeffaf olamaz** ve köşe yuvarlatmasını sistem kendisi uygular.
  Kaynak çalışmanın kendi yuvarlak köşeleri kırpılır, aksi halde maskeden sonra
  siyah köşe artıkları görünür.
- **Android adaptif ikonun** dış alanı cihaza göre daire/squircle kırpılır.
  Ön katman şeffaf olmalı ve içerik güvenli alana sığmalıdır; bu yüzden ön
  katmanda yalnızca pin, %62 ölçekle yerleştirilir. Zemin rengi `app.json`
  içindeki `adaptiveIcon.backgroundColor` alanından gelir.
- **Açılış ekranında** wordmark kullanılmaz: yazının rengi koyu lacivert olduğu
  için koyu splash zemininde okunmuyor. Splash'te de pin kullanılır.
- **Uygulama içi logo** şeffaf olmalıdır; opak bir kare, koyu arayüzde kutu gibi
  görünür. Pin, wordmark'tan (zaten şeffaf olan kaynaktan) kesilerek elde edilir.
