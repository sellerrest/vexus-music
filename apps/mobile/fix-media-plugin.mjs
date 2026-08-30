/*
 * Правит службу уведомления в плагине @jofr/capacitor-media-session.
 *
 * Зачем: плагин вызывает startForegroundService(), а startForeground() делает
 * только после асинхронной привязки к службе. Android даёт на это пять секунд
 * и по их истечении убивает приложение с ForegroundServiceDidNotStartInTime.
 * Снаружи выглядело как случайные вылеты при включении трека — не на каждом и
 * без всякой закономерности, потому что зависит от загруженности телефона.
 *
 * Правка делает то, чего не хватало: выводит службу на передний план сразу, в
 * onStartCommand, с заглушкой вместо карточки. Настоящую карточку с названием
 * и обложкой ставит потом сам плагин, когда привязка завершится.
 *
 * Файл лежит в node_modules, а те в репозиторий не входят, поэтому правка
 * накладывается скриптом при каждой сборке (см. apps/build.sh). Скрипт
 * повторно безопасен: если правка уже на месте, он ничего не делает.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(
  ROOT,
  'node_modules/@jofr/capacitor-media-session/android/src/main/java',
  'io/github/jofr/capacitor/mediasessionplugin/MediaSessionService.java',
)

if (!fs.existsSync(FILE)) {
  console.log('  плагин не установлен — правка не нужна')
  process.exit(0)
}

let src = fs.readFileSync(FILE, 'utf8')

if (src.includes('startForegroundNow')) {
  console.log('  правка службы уже на месте')
  process.exit(0)
}

const ПОЛЕ_БЫЛО = '    private NotificationManager notificationManager;'
const ПОЛЕ_СТАЛО = `    private NotificationManager notificationManager;
    /** Уже вышли на передний план — второй раз не нужно. */
    private boolean foregroundStarted = false;`

const КОМАНДА_БЫЛО = `    public int onStartCommand(Intent intent, int flags, int startId) {
        MediaButtonReceiver.handleIntent(mediaSession, intent);
        return super.onStartCommand(intent, flags, startId);
    }`

const КОМАНДА_СТАЛО = `    public int onStartCommand(Intent intent, int flags, int startId) {
        // Выходим на передний план СРАЗУ: система отсчитывает пять секунд с
        // момента startForegroundService(), и не уложиться значит быть убитым.
        startForegroundNow();
        MediaButtonReceiver.handleIntent(mediaSession, intent);
        return super.onStartCommand(intent, flags, startId);
    }

    /** Минимальное уведомление, лишь бы уложиться в отведённое время. */
    private void startForegroundNow() {
        if (foregroundStarted) {
            return;
        }
        if (notificationManager == null) {
            notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "playback", "Playback", NotificationManager.IMPORTANCE_LOW);
            notificationManager.createNotificationChannel(channel);
        }
        NotificationCompat.Builder builder = notificationBuilder;
        if (builder == null) {
            builder = new NotificationCompat.Builder(this, "playback")
                    .setSmallIcon(R.drawable.ic_baseline_volume_up_24)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, builder.build(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, builder.build());
            }
            foregroundStarted = true;
        } catch (Exception e) {
            // Android 14+ вправе отказать, если приложение в фоне. Падать из-за
            // этого нельзя: музыка играет и без карточки в шторке.
            Log.w(TAG, "Не удалось выйти на передний план: " + e);
        }
    }`

const ОСНОВНОЙ_БЫЛО = `        } else {
          startForeground(NOTIFICATION_ID, notificationBuilder.build());
        }`
const ОСНОВНОЙ_СТАЛО = `        } else {
          startForeground(NOTIFICATION_ID, notificationBuilder.build());
        }
        foregroundStarted = true;`

for (const [было, стало, имя] of [
  [ПОЛЕ_БЫЛО, ПОЛЕ_СТАЛО, 'поле признака'],
  [КОМАНДА_БЫЛО, КОМАНДА_СТАЛО, 'onStartCommand'],
  [ОСНОВНОЙ_БЫЛО, ОСНОВНОЙ_СТАЛО, 'основной вызов'],
]) {
  if (!src.includes(было)) {
    console.error(`  НЕ НАЙДЕНО: ${имя}. Плагин обновился — правку надо пересмотреть.`)
    process.exit(1)
  }
  src = src.replace(было, стало)
}

fs.writeFileSync(FILE, src)
console.log('  служба уведомления исправлена: выход на передний план сразу')
