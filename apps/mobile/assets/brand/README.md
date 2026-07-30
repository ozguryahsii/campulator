# Marka Görselleri

Gerçek logo ve uygulama ikonu dosyaları buraya eklenecek:

| Dosya               | Kullanım                        | Önerilen boyut          |
| ------------------- | ------------------------------- | ----------------------- |
| `icon.png`          | Uygulama ikonu (app.json)       | 1024×1024, köşesiz kare |
| `splash.png`        | Açılış ekranı                   | 1284×2778 veya vektörel |
| `logo-full.png`     | Yatay logo (pin + "Campulator") | şeffaf arka plan        |
| `adaptive-icon.png` | Android adaptif ikon ön katmanı | 1024×1024               |

Dosyalar eklendiğinde `app.json` içindeki `icon`, `splash.image` ve
`android.adaptiveIcon` alanları bu yollara bağlanacak.

Görseller eklenene kadar uygulama içinde `src/components/BrandLogo.tsx`
(vektörel yaklaşık versiyon) kullanılıyor.
