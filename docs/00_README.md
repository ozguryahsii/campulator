# Campulator Dokümantasyon Paketi

Bu paket Campulator mobil uygulaması ve yönetici paneli için aşağıdaki belgeleri içerir:

1. `01_urun_gereksinimleri.md`
2. `02_teknik_mimari.md`
3. `03_veri_modeli.md`
4. `04_api_taslagi.md`
5. `05_mobil_ui_promptu.md`
6. `06_admin_panel_promptu.md`
7. `07_gelistirme_fazlari.md`

## Temel Teknoloji Kararları

- Mobil: React Native + Expo + TypeScript
- Harita: Google Maps
- Backend: Node.js + NestJS
- Veritabanı: PostgreSQL
- Yönetici Paneli: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Push: Firebase Cloud Messaging
- Dosya Depolama: Geliştirmede yerel storage; production için soyutlanmış provider
- Dil: Türkçe + İngilizce, baştan çok dilli mimari
- Tema: İlk sürüm yalnızca koyu tema; açık tema için design token altyapısı hazır
