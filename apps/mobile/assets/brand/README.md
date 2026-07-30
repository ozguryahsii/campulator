# Marka Görselleri

## Gerçek logoları nereye koymalı

Bu klasöre (`apps/mobile/assets/brand/`) **aşağıdaki tablodaki adlarla** koyun ve
mevcut dosyaların üzerine yazın. Kod bu adlara bağlı olduğu için başka hiçbir
değişiklik gerekmez — `app.json` ve `BrandLogo.tsx` olduğu gibi çalışmaya devam eder.

```bash
# örnek: masaüstündeki dosyaları yerleştirme
cp ~/Desktop/campulator-icon.png   apps/mobile/assets/brand/icon.png
cp ~/Desktop/campulator-logo.png   apps/mobile/assets/brand/logo.png
git add apps/mobile/assets/brand && git commit -m "Gerçek marka görselleri" && git push
```

Sonrasında Metro'yu `--clear` ile yeniden başlatın (varlıklar önbelleğe alınır).
Elinizde yalnızca tek bir kare logo varsa onu `logo.png` olarak koymanız yeterli;
kalan boyutlar `generate.py` yerine bu dosyadan türetilebilir.

## Dosyalar

| Dosya                | Kullanım                            | Boyut     | Zemin  |
| -------------------- | ----------------------------------- | --------- | ------ |
| `icon.png`           | iOS/Android uygulama ikonu          | 1024×1024 | Opak   |
| `adaptive-icon.png`  | Android adaptif ikon ön katmanı     | 1024×1024 | Şeffaf |
| `splash-icon.png`    | Açılış ekranı görseli               | 1024×1024 | Şeffaf |
| `logo.png`           | Uygulama içi logo (`BrandLogo.tsx`) | 512×512   | Şeffaf |
| `favicon.png`        | Web favicon                         | 48×48     | Opak   |

Bu dosyalar `app.json` içindeki `icon`, `splash.image`, `android.adaptiveIcon`
ve `web.favicon` alanlarına bağlıdır.

## Yeniden üretme

Görseller `generate.py` ile vektörel tanımdan üretiliyor (Pillow gerektirir):

```bash
cd apps/mobile/assets/brand && python3 generate.py
```

Renkler `src/theme/tokens.ts` paletiyle birebir aynıdır. Tasarımcıdan gelen
gerçek dosyalar elde edildiğinde aynı adlarla üzerine yazmak yeterlidir;
`app.json` değişikliği gerekmez.

## Notlar

- iOS ikonu **şeffaf olamaz**; `icon.png` opak lacivert zeminle üretilir.
- Android adaptif ikonda dış %22'lik alan kırpılabilir; `adaptive-icon.png`
  bu güvenli alan payıyla üretilmiştir.
