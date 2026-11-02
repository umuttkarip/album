# Album

Umut ve Sude için fotoğraf defteri. Mobil öncelikli React/TypeScript arayüzü, esneyen Three.js sayfaları ve Konva serbest sayfa editörü.

Arayüz: https://umuttkarip.github.io/album/ · Özel API: https://album-api.umuttkarip.workers.dev. Hesap sahibinin D1 `album` veritabanı ve özel R2 `album` kovası kullanılır.

Arayüz bu GitHub deposundan GitHub Pages'e yayımlanır. Giriş ve özel fotoğraflar ayrı, hesap sahibinin yönettiği Cloudflare Worker/D1/R2 üzerinde çalışır. Bu depo fotoğraf, parola, oturum veya özel veri içermez. Sunucu adresi yapılandırılmadığında giriş devre dışıdır; başka bir sağlayıcıya otomatik yönlendirme yapılmaz.

## Geliştirme

Node.js 24 kullanın. `npm ci`, ardından `npm test` ve `npm run build` çalıştırın. Yerel arayüz için `ALBUM_API_BASE=http://127.0.0.1:8787 npm run dev` kullanılır (PowerShell'de `$env:ALBUM_API_BASE='http://127.0.0.1:8787'`). Sayfa kökü `/album/` adresidir. `ALBUM_PUBLIC_BASE=/` ile özel alan adı köküne uyarlanabilir.

## Kendi sunucu hesabını bağlama

`wrangler login` ile kendi Cloudflare hesabınıza girin. Yapılandırma hesap sahibinin mevcut özel `album` kovasını kullanır; kovayı yeniden oluşturmayın. D1 kaynağı yoksa `wrangler d1 create album` ile oluşturup dönen kimliği `wrangler.album.jsonc` içine yazın. R2 aboneliği ve varsa ücret koşulları hesap sahibince etkinleştirilmelidir; dağıtım betiği abonelik açmaz.

Veritabanını `wrangler d1 migrations apply album --remote --config wrangler.album.jsonc` ile hazırlayın. `ALBUM_UMUT_HASH` ve `ALBUM_SUDE_HASH` değerlerini `wrangler secret put` ile girin; biçim `salt:scryptHex`, scrypt N=32768, r=8, p=3, çıktı 64 bayttır. Parolaları veya hashlerini depoya koymayın. `npm run deploy:api` ile sunucuyu dağıtın.

GitHub repository variable `ALBUM_API_BASE` değerini kendi Worker HTTPS kök adresinize ayarlayın ve GitHub Pages iş akışını çalıştırın. Değer `/api` ile bitmez. Sunucudaki `ALBUM_ALLOWED_ORIGINS` tam arayüz kaynağını izinli tutar; varsayılan `https://umuttkarip.github.io` ve yerel geliştirme adresidir. Özel alan adında bu listeyi de güncelleyin.

Kişisel albümleri sahibi ve yönetici görebilir; yalnız sahibi düzenler. Ortak albümleri iki hesap düzenler. Fotoğraflar herkese açık R2 bağlantılarıyla sunulmaz: bütün varyantlar sunucuda albüm yetkisi kontrolünden geçer. GitHub Pages ile API arasında oturum `Authorization` başlığında taşınır, sekmenin sessionStorage alanında tutulur; fotoğraf URL'lerine erişim belirteci eklenmez. Çıkış oturumu sunucuda iptal eder.

## Yayın

`main` dalına gönderim `.github/workflows/pages.yml` ile test, derleme ve GitHub Pages yayınını başlatır. Sunucu adresi sır değildir; hesap hashleri Cloudflare secrets, fotoğraflar özel R2, belgeler D1 içinde kalır. `web`, `.local`, `.dev.vars`, `.env` ve yerel veritabanları Git'e eklenmez.

## Kapak ve sayfa düzeni

Boş veya otomatik sayfalar, yüklenen fotoğraflardan düzen üretir; özel düzenler korunur. Kapak 0/1/3 fotoğrafa göre renkli, tek fotoğraflı veya kolaj olur. Tamamen otomatik albüm yüklemelerle her dört fotoğrafta bir sayfa çifti ekler. Dokuz şablon gerçek fotoğraflarla önizlenir; dört font, kalın/italik metin, not yazısı, altı kâğıt ve üç doku seçilebilir. Bütün alanlar aynı sürümlü belgeye kaydolur. CI yayın öncesinde font yollarını, gerçek WOFF2 dosyalarını ve özel API'nin oturumsuz erişimi reddetmesini denetler.

## Tasarımlar ve güncelleme

Altı tasarım kapak ve sayfa önizlemeleriyle seçilir. Albüm ayarındaki yeni tasarım yalnız yeni sayfaların varsayılanıdır; mevcut bir sayfada Kâğıt bölümünden önizlenip uygulanır. İki sayfa Sığdır/Doldur, bağımsız sol/sağ kâğıt, dört fotoğraf kenarı ve mobil çalışma odağı aynı belge modelini kullanır. 48 malzeme, beş şeffaf kullanıcı görseli ve özel yüklemeler ayrı paketlerdedir.

Yeni albüm ekranında büyük kapak/açık sayfa önizlemesi ve fotoğrafsız kapak görünümü vardır; örnek fotoğraflar yeni albüme kopyalanmaz. Altı tasarımın yeni yerleşimleri opsiyonel `layoutVersion:2` belge alanıyla ayrılır. Sürümsüz otomatik belgeler eski düzenlerini, elle düzenlenmiş belgeler bütün konumlarını korur. Veritabanı migration'ı gerekmez; yeni albümlerin bu alanla başlaması için Worker ve arayüz birlikte güncellenir.

Cilt rengi kayıtlı kapak yüzeyini devralır; kütüphane yaprakları gerçek sayfa önizlemeleridir. Mobil editörde Fotoğraf/Şablon/Metin/Çıkartma araçları görünür; Diğer menüsü çizim ve kâğıt araçlarını açar. Günler küçük yığınları 4:5, açılan gün fotoğrafları kaynak oranıyla gösterir. Gerektiğinde çizim ve sınırlı görüntü/doku önbellekleri korunur.

Okuyucu ilk açılışta tek sayfa kullanır; yeni tercih anahtarı eski ikili varsayılanını devralmaz. Dikey ekranda çift sayfa serbesttir ve yatay kullanım önerilir. Geniş yatay telefonlarda kontroller defterin yanlarına taşınır; cihazı döndürmek sayfayı veya tercihi değiştirmez. Arka kâğıt blokları gerçek sol/sağ yüzlerden oluşturulur; cilt gölgesi/ışığı editör, okuyucu ve önizlemede ortak çizilir.

Worker güncellemesinden önce `npx wrangler d1 migrations apply album --remote --config wrangler.album.jsonc` ile0001 migration'ını uygula. Eski belgeler ve orijinal fotoğraflar korunur. Fiziksel Android dokunma testi, responsive tarayıcı kontrolünden ayrıdır.
