import { build } from 'vite';

console.log('UX Doctor - Vite derleme işlemi başlatılıyor...');
try {
  await build();
  console.log('UX Doctor - Derleme başarıyla tamamlandı!');
} catch (err) {
  console.error('Derleme sırasında hata oluştu:', err);
  process.exit(1);
}
