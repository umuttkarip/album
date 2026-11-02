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
