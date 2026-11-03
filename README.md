# Album

Umut ve Sude için fotoğraf defteri. Mobil öncelikli React/TypeScript arayüzü, esneyen Three.js sayfaları ve Konva serbest sayfa editörü.

Site: https://album.umuttkarip.workers.dev/ . Arayüz ve API hesap sahibinin tek Cloudflare Worker adresinde çalışır. D1 ve özel R2 kaynakları aynı hesapta kalır; GitHub kaynak kodunu saklar. Eski GitHub Pages bağlantısı asıl siteye yönlendirir. Depo fotoğraf, parola, oturum veya özel veri içermez.

## Geliştirme ve yayın

Node.js 24 kullanın. npm ci, npm test ve npm run build çalıştırın. Aynı adres için ALBUM_PUBLIC_BASE=/ ve ALBUM_SAME_ORIGIN=1 ayarlanır; ALBUM_API_BASE boş kalır. Yerel ayrı API geliştirmesinde ALBUM_API_BASE=http://127.0.0.1:8787 ile eski bearer akışı kullanılabilir.

Cloudflare hesabında Wrangler oturumu açın. Mevcut D1 ve R2 kaynaklarını yeniden oluşturmayın. npx wrangler d1 migrations apply album --remote --config wrangler.site.jsonc ile migration'ları uygulayın. ALBUM_UMUT_HASH ve ALBUM_SUDE_HASH, Cloudflare secrets içinde salt:scryptHex biçimindedir; scrypt N=32768, r=8, p=3 ve çıktı64 bayt. Gerçek parola veya hash depoya yazılmaz. İlk kurulumda bu iki secret yeni album Worker'ına da atanır.

npm run deploy:site, yeni ve ayrı bir yerel klasöre derler; dosyaları silmeden kontrol edip Worker ve Assets'i birlikte yayımlar. Önce D1 migration'larını uygulayın. GitHub main iş akışı testleri, kök adres derlemesini ve canlı API gizliliğini doğrular; Pages'e yalnız yönlendirme sayfası gönderir. Cloudflare yayını için yerel Wrangler yetkisi kullanılır; GitHub'a ek Cloudflare erişimi verilmez.

## Oturum ve erişim

Asıl site yalnız host'a ait __Host-album_session çerezini kullanır: HttpOnly, Secure, SameSite=Strict, Path=/ ve30 gün. auth/me geçerli oturumun süresini yeniler; çıkış sunucudaki belirteç özetini iptal eder. Oturum belirteci JavaScript depolarına veya URL'ye yazılmaz. Yazmalar aynı kaynak kontrolünden geçer.

Özel albümleri sahibi ve yönetici görür; yalnız sahibi düzenler. Ortak albümleri iki hesap düzenler. Bütün fotoğraf varyantları albüm yetkisiyle kontrol edilir; R2 herkese açık değildir. Silinenler gizlenir ve yönetici arşivinde kırmızı çerçeveyle korunur. Eski album-api servisi ve veriler uyumluluk için yerinde tutulur.

Etkileşimli tur doğru ekranı açar ve gerçek kontrolleri vurgular. Ana sayfa, serbest sayfa gezintisi, çift görünüm, editör/iki geri, Takvim/bir tarih ve özel albüm formu izlenir. Gezinme süresini kullanıcı belirler; sayfa kotası ve sayacı yoktur. Otomatik fotoğraf veya albüm yazımı yapılmaz. Menüdeki Kısa kullanım yeniden açar. Sude için geçici test ayarı her yenilemede davet gösterir; Umut bir kez davranışını ve mevcut seen kayıtlarını korur.

## Kapak ve sayfa düzeni

Boş veya otomatik sayfalar, yüklenen fotoğraflardan düzen üretir; özel düzenler korunur. Kapak 0/1/3 fotoğrafa göre renkli, tek fotoğraflı veya kolaj olur. Tamamen otomatik albüm yüklemelerle her dört fotoğrafta bir sayfa çifti ekler. Dokuz şablon gerçek fotoğraflarla önizlenir; dört font, kalın/italik metin, not yazısı, altı kâğıt ve üç doku seçilebilir. Bütün alanlar aynı sürümlü belgeye kaydolur. CI yayın öncesinde font yollarını, gerçek WOFF2 dosyalarını ve özel API'nin oturumsuz erişimi reddetmesini denetler.

## Tasarımlar ve güncelleme

Altı tasarım kapak ve sayfa önizlemeleriyle seçilir. Albüm ayarında yeni tasarım varsayılanı değişir; Mevcut sayfalara da uygula seçeneği sürüm/kilit kontrolüyle yalnız malzemeleri değiştirir, fotoğraf konumlarını korur. İki sayfa Sığdır/Doldur, bağımsız sol/sağ kâğıt, dört fotoğraf kenarı ve mobil çalışma odağı aynı belge modelini kullanır. 48 malzeme, beş şeffaf kullanıcı görseli ve özel yüklemeler ayrı paketlerdedir.

Yeni albüm ekranında büyük kapak/açık sayfa önizlemesi ve fotoğrafsız kapak görünümü vardır; örnek fotoğraflar yeni albüme kopyalanmaz. Altı tasarımın yeni yerleşimleri opsiyonel `layoutVersion:2` belge alanıyla ayrılır. Sürümsüz otomatik belgeler eski düzenlerini, elle düzenlenmiş belgeler bütün konumlarını korur. Veritabanı migration'ı gerekmez; yeni albümlerin bu alanla başlaması için Worker ve arayüz birlikte güncellenir.

Cilt rengi kayıtlı kapak yüzeyini devralır; kütüphane yaprakları gerçek sayfa önizlemeleridir. Mobil editörde Fotoğraf/Şablon/Metin/Çıkartma araçları görünür; Diğer menüsü çizim ve kâğıt araçlarını açar. Takvim küçük yığınları 4:5, açılan gün fotoğrafları kaynak oranıyla gösterir. Gerektiğinde çizim ve sınırlı görüntü/doku önbellekleri korunur.

Okuyucu ilk açılışta tek sayfa kullanır; yeni tercih anahtarı eski ikili varsayılanını devralmaz. Dikey ekranda çift sayfa serbesttir ve yatay kullanım önerilir. Geniş yatay telefonlarda kontroller defterin yanlarına taşınır; cihazı döndürmek sayfayı veya tercihi değiştirmez. Arka kâğıt blokları gerçek sol/sağ yüzlerden oluşturulur; cilt gölgesi/ışığı editör, okuyucu ve önizlemede ortak çizilir.

Worker güncellemesinden önce wrangler.site.jsonc ile bekleyen D1 migration’larını uygula. Eski belgeler ve orijinal fotoğraflar korunur. Fiziksel Android dokunma testi, responsive tarayıcı kontrolünden ayrıdır.

## Aktarım ve dokunma

Okuyucu, çizilecek fotoğrafın piksel gereksinimine göre360px thumb,1280px screen veya2560px display kopyasını seçer; kadraj yakınlaştırması da hesaba katılır. Eksik screen kopyası eski display dosyasına geri döner. Yeni yüklemeler dört varyant üretir; orijinal dosya değişmez. Mevcut varlığa screen eklenebilir, varsa koşullu R2 yazımı409 döner. Eski üç varyantın tamamlanma maskesi7 ile yeni15 birlikte desteklenir.

Sıkıştırılmış görüntüler sayfanın belleğinde en fazla24MiB/192 kayıt tutulur; eşzamanlı istekler birleştirilir. Orijinaller/indirmeler bu önbelleğe girmez. Çıkış ve fotoğraf kaldırma önbelleği temizler; bekleyen iptal edilmiş yükleme geri dolduramaz. Özel HTTP yanıtları private/no-store kalır; disk önbelleği veya herkese açık R2 kullanılmaz.

Telefon yataya döndüğünde aynı kompozisyon çift sayfa açılır; dikeye dönüşte önceki tercih ve sağ/sol sayfa korunur. Otomatik dönüş kalıcı tercihi yazmaz; elle görünüm seçimi serbesttir. Albüm fotoğrafı500ms basılı tutmayla orijinal dosyasından açılır. Kısa dokunuş,8px üstü hareket, iptal ve çoklu dokunma yanlışlıkla fotoğraf açmaz. Kapak kısa dokunuşla açılır; klavye için orijinal fotoğraf eylemleri odakta görünür.

Dosya seçimi ve sürükleyip bırakma aynı yükleme hattını kullanır. Editör dosya listesini kayıt beklemeden kopyalar; Takvim dosya seçicisi açık gün dialog’unun içindedir. Dosya içeriği JPEG/PNG/WebP olarak doğrulanır, işletim sisteminin boş MIME bilgisine bağlı kalınmaz. İşleme sırayla, dosya aktarımı en fazla iki eşzamanlı işte yapılır; 2560/1280/360px WebP kopyaları otomatik hazırlanırken orijinal korunur. Yeniden denemede yetkili upload-status sunucuda tamamlanan parçaları bildirir; yanıtı kaybolmuş kopya yeniden yazılmaz.

Sude ilk girişinde geçici şifresini değiştirir; aynı HttpOnly oturum korunur. D1 user_credentials tablosunda scrypt doğrulama özeti ve ayrı ALBUM_PASSWORD_KEY secret’ıyla AES-256-GCM şifrelenmiş, sunucuda geri çözülebilen değer tutulur. Parola okuma API’si veya yönetim menüsü yoktur; Umut’un hesabı değişmez. Migration0004 uygulanmalı ve32 baytlık anahtar Worker secret olarak kurulmalıdır.
