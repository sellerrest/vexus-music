package pw.vexus.music;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Любое число: нужен лишь для того, чтобы отличить свой ответ от чужих. */
    private static final int NOTIFICATIONS_REQUEST = 4711;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestNotificationsPermission();
    }

    /**
     * Просит разрешение показывать уведомления.
     *
     * Начиная с Android 13 его выдаёт только сам пользователь и только по
     * запросу во время работы. Без него музыка играет, но карточки с
     * названием и кнопками в шторке нет — а именно она и есть смысл всей
     * затеи. На версиях старше разрешение выдаётся при установке, и спрашивать
     * нечего.
     *
     * Отказ ничего не ломает: приложение работает дальше, просто без
     * уведомления, поэтому ответ и не обрабатывается.
     */
    private void requestNotificationsPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        boolean granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        if (!granted) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATIONS_REQUEST
            );
        }
    }
}
