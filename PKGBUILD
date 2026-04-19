# Maintainer: nikits <nikits1993@gmail.com>
pkgname=babytummytime
pkgver=0.2.0
pkgrel=1
pkgdesc="Baby tummy time tracker with Supabase backend"
arch=('x86_64')
url="https://github.com/nikits/babytummytime"
license=('MIT')
depends=(
  'webkit2gtk-4.1'
  'gtk3'
  'libayatana-appindicator'
)
makedepends=(
  'nodejs'
  'npm'
  'rust'
  'cargo'
)
source=("$pkgname-$pkgver.tar.gz")
sha256sums=('SKIP')

build() {
  cd "$pkgname-$pkgver"
  npm install
  npm run tauri build -- --bundles deb
}

package() {
  cd "$pkgname-$pkgver"

  # Install the compiled binary
  install -Dm755 "src-tauri/target/release/babytummytime" \
    "$pkgdir/usr/bin/babytummytime"

  # Desktop entry
  install -Dm644 "packaging/babytummytime.desktop" \
    "$pkgdir/usr/share/applications/babytummytime.desktop"

  # Icon
  install -Dm644 "src-tauri/icons/128x128.png" \
    "$pkgdir/usr/share/pixmaps/babytummytime.png"
}
