# Campulator — Ürün Gereksinimleri Dokümanı

## 1. Ürün Özeti

Campulator; kamp, karavan, piknik ve mangal noktalarını harita üzerinde gösteren, gelişmiş filtreleme, Smart Match, kullanıcı katkısı, puanlama, yorum, fotoğraf, karşılaştırma ve moderasyon özellikleri sunan mobil platformdur.

## 2. Hedef Platformlar

- iOS
- Android
- Yönetici paneli: Web

## 3. Ana Navigasyon

1. Keşfet
2. Ara
3. Ekle
4. Kaydedilenler
5. Profil

## 4. İlk Açılış Akışı

1. Logo animasyonu
2. Dil seçimi: Türkçe / English
3. Üç sayfalık onboarding
   - Keşfet
   - Karşılaştır
   - Smart Match
4. Giriş / kayıt
5. E-posta ile kayıt için doğrulama
6. Ana uygulama

Misafir kullanıcılar keşif, arama, Smart Match, detay görüntüleme ve rota oluşturmayı kullanabilir. Favori, yorum, puan, fotoğraf, nokta ekleme ve doğrulama için giriş gerekir.

## 5. Kimlik Doğrulama

- E-posta + şifre
- Google ile giriş
- Apple ile giriş
- E-posta ile kayıt olanlarda e-posta doğrulaması zorunlu
- Doğrulanmamış kullanıcı katkı işlemi yapamaz

## 6. Keşfet Sekmesi

Amaç serbest gezinme ve harita üzerinde noktaları incelemektir.

Özellikler:

- Google Maps
- Koyu harita teması
- Metin araması
- Hızlı filtreler
- Gelişmiş filtre paneli
- Marker cluster
- Marker + alt yatay kart senkronizasyonu
- Harita / tam liste geçişi
- Kalıcı kapalı noktalar varsayılan gizli
- Konum izni yalnızca “Yakınımdakiler” veya rota kullanıldığında istenir

## 7. Ara Sekmesi

İki mod içerir:

### 7.1 Standart Arama

- Nokta adı
- Şehir
- Bölge
- Ülke

### 7.2 Smart Match

Kullanıcı kriterleri seçer. Tüm seçilen kriterler eşit ağırlıklıdır.

Smart Match = eşleşen kriter sayısı / toplam seçilen kriter sayısı × 100

- Tüm noktalar gösterilir
- Yüksek eşleşmeden düşüğe sıralanır
- Liste / harita görünümü arasında geçiş yapılır
- Eksik kriterler kullanıcıya gösterilir
- Aramalar kaydedilebilir
- Kayıtlı aramalar Ara sekmesinde ve Kaydedilenler bölümünde gösterilir

## 8. Filtre Sistemi

### Aktivite

- Karavan
- Çadır
- Piknik
- Mangal / barbekü

### Ücret

- Ücretsiz
- Ücretli

### İmkânlar

- WC
- Duş
- İçme suyu
- Elektrik
- Market
- Masa
- Çöp kutusu
- Wi-Fi
- Otopark
- Aydınlatma
- Engelli erişimi
- Karavan elektrik bağlantısı
- Gri su boşaltma

### İzinler

- Ateş yakılabilir
- Mangal yapılabilir
- Evcil hayvan
- Karavan erişimi

### Erişim

- Asfalt
- Normal araç
- Yüksek araç
- 4x4 gerekli

### Doğa / kullanım

- Göl kenarı
- Deniz kenarı
- Orman
- Dağ
- Aileye uygun
- Sessiz
- Kalabalık seviyesi

### Diğer

- Telefon çekim gücü
- Kullanıcı puanı
- Mesafe
- Çalışma durumu
- Kalıcı kapalı noktaları göster

## 9. Marker Sistemi

Marker ana ikonu görsel temsil içindir; filtreleme tüm desteklenen aktiviteler üzerinden yapılır.

Ana ikon önceliği:

1. Karavan
2. Çadır
3. Piknik
4. Mangal

Örnek:

- Karavan + çadır + piknik + mangal = Karavan ikonu +3
- Çadır + piknik = Çadır ikonu +1

Ana marker rengi Campulator yeşilidir. Kategori iç ikon ve küçük vurgu rengiyle ayrışır.

Cluster:

- Sayısal kümeleme
- Dokununca yakınlaştırma
- Baskın kategori vurgusu
- Cluster açıldığında alt kartlarda noktaların listelenmesi

## 10. CampScore

CampScore üç bileşenden oluşur:

- Features Score / Özellikler Puanı: %45
- User Rating / Kullanıcı Puanı: %35
- Atmosphere Score / Atmosfer Puanı: %20

Formül:

CampScore = (Features Score × 0.45) + (User Rating × 0.35) + (Atmosphere Score × 0.20)

Tüm değerler 5 üzerinden hesaplanır ve sonuç tek ondalıkla gösterilir.

### 10.1 Features Score

Sistemin doğrulanmış imkânlara göre hesapladığı puandır. Her özellik eşit ağırlıklı olmak zorunda değildir. Nokta türüne uygulanmayan özellikler eksik sayılmaz.

### 10.2 User Rating

Kullanıcıların 1–5 tam yıldız üzerinden verdiği puanların ortalamasıdır. Kullanıcı başına bir aktif değerlendirme bulunur; yılda bir yeni değerlendirme yapılabilir. Ortalama küsuratlı olabilir.

Alt kategoriler:

- Temizlik
- Güvenlik
- Manzara
- Ulaşım
- Fiyat/performans

### 10.3 Atmosphere Score

- Telefon çekim gücü
- Sessizlik
- Kalabalık seviyesi
- Mahremiyet
- Gece sakinliği
- Sosyal ortam

## 11. Nokta Detay Ekranı

- Fotoğraf galerisi
- Fotoğraf yoksa “Fotoğraf bekleniyor”
- Nokta adı
- Tam Konum / Yaklaşık Konum etiketi
- Çalışma durumu
- CampScore
- Üç alt skor
- Aktivite ve imkânlar
- Kullanıcı yorumları
- Fotoğraf galerisi
- Son doğrulanma bilgisi
- Kaydet
- Yol Tarifi
- Karşılaştır
- Katkıda Bulun menüsü:
  - Yorum yap
  - Puan ver
  - Fotoğraf ekle
  - Bilgi doğrula
  - Şikâyet et
  - Değişiklik öner

## 12. Konum Hassasiyeti

Noktayı ekleyen:

- Tam konum
- Yaklaşık konum

seçebilir.

Yaklaşık konum:

- Sabit 500 metre yarıçap
- Kartta “Yaklaşık Konum · ±500 m”
- Normal API yanıtında gerçek koordinat gönderilmez
- Rota alan merkezine kadar oluşturulur

## 13. Nokta Ekleme

Zorunlu:

- Nokta adı
- Konum
- En az bir aktivite

İsteğe bağlı:

- Ücret
- Diğer aktiviteler
- İmkânlar
- Yol durumu
- Atmosfer bilgisi
- Açıklama
- Fotoğraf
- Tam / yaklaşık konum

Form tamamlama yüzdesi gösterilir.

Fotoğraf zorunlu değildir. Fotoğrafsız nokta “Fotoğraf bekleniyor” etiketiyle yayınlanabilir.

Yeni kullanıcı noktaları moderasyona düşer. Güvenilir kullanıcıların noktaları doğrudan yayınlanır.

## 14. Mükerrer Nokta Kontrolü

- Yakın koordinat kontrolü
- Normalize edilmiş isim benzerliği
- Olası mükerrer kayıt moderasyona düşer
- Admin birleştirme, reddetme veya ayrı onay verebilir
- Birleştirmede yorum, fotoğraf, puan ve katkı geçmişi korunur

## 15. Yorum ve Puanlama

- Yorumlar anında yayınlanır
- Fotoğraflar anında yayınlanır
- Şikâyet edilirse moderasyon kuyruğuna düşer
- Yorumlara tek seviyeli yanıt
- Faydalı işaretleme
- Fotoğraflı yorum
- İşletmenin resmî yanıtı
- Sıralama:
  - En yeni
  - En faydalı
  - En yüksek puan
  - En düşük puan
  - Fotoğraflı yorumlar

## 16. Kullanıcı Profili

- Ad
- Fotoğraf
- Biyografi
- Yorumlar
- Puanlamalar
- Eklenen noktalar
- Onaylanan düzeltmeler
- Fotoğraflar
- Katkı istatistikleri
- Güvenilirlik seviyesi
- Rozetler

Seviyeler:

- Yeni Kullanıcı
- Katkıcı
- Güvenilir Katkıcı
- Uzman Kampçı

Sayısal güven puanı gizlidir.

Profil açık; favoriler ve koleksiyonlar özeldir. Yorum ve katkılar herkese açıktır. Takip sistemi yoktur.

## 17. İşletme Hesabı

Doğrulama ilk sürümde admin tarafından manuel yapılır.

Yetkiler:

- Resmî yorum yanıtı
- İletişim ve açıklama değişikliği önerme
- Fiyat, çalışma dönemi, özellik ve fotoğraf güncelleme talebi
- İstatistik görüntüleme

Değişiklikler admin onayına düşer.

## 18. Kaydedilenler

- Kullanıcı koleksiyonları
- Kayıtlı aramalar
- Koleksiyon içinde sürükle-bırak sıralama
- Bir nokta birden fazla koleksiyonda olabilir
- Paylaşım sonraki faz; veri modeli hazır

## 19. Karşılaştırma

- En fazla 3 nokta
- Yatay kaydırmalı yapı
- CampScore ve alt skorlar
- Ücret
- Aktivite
- İmkânlar
- İzinler
- Yol erişimi
- Telefon çekimi
- Atmosfer
- Çalışma durumu
- Tam / yaklaşık konum
- Smart Match bağlamında match yüzdesi

## 20. Rota

İlk sürüm:

- Başlangıç noktası
- Hedef nokta
- Google Maps rota görünümü
- Tahmini süre
- Mesafe

Rota kaydetme ve çok duraklı planlama yoktur.

## 21. Çalışma Durumu

- Açık
- Geçici kapalı
- Kalıcı kapalı
- Mevsimlik açık

Kullanıcı “Kapalı görünüyor” bildirimi yapabilir. Kalıcı kapalı noktalar varsayılan gizlidir.

## 22. Bildirimler

İlk sürüm:

- Uygulama içi bildirim
- Firebase Cloud Messaging push

Sonraki faz:

- E-posta bildirimleri

E-posta doğrulama mesajı ilk sürümde aktiftir.

## 23. Şikâyetler

Kategoriler:

- Spam
- Yanlış bilgi
- Hakaret / taciz
- Uygunsuz fotoğraf
- Sahte kullanıcı veya yorum
- Güvenlik riski
- Yanlış konum
- Kapanmış işletme
- Yasak faaliyet
- Diğer

Şikâyet edilen içerik admin inceleyene kadar yayında kalır.

## 24. Hesap Silme

Hesap silinir. Kamusal katkılar “Silinmiş Kullanıcı / Deleted User” adıyla kalır. Özel veriler, favoriler, koleksiyonlar, kayıtlı aramalar ve token’lar silinir.

## 25. Gelir Modeli

İlk sürüm:

- Ücretsiz
- Reklamsız

Premium ve reklam altyapısı sonraki faza hazır olacak.

## 26. Yasal Onaylar

Zorunlu:

- Kullanım Koşulları
- Gizlilik Politikası
- Topluluk Kuralları

Ayrı bilgilendirmeler:

- Konum
- Fotoğraf ve içerik paylaşımı
- Kamusal görünürlük
- Moderasyon

İsteğe bağlı:

- Pazarlama iletişimi
