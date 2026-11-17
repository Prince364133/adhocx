package com.adhocx.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.annotation.NonNull
import androidx.core.view.WindowCompat
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {
    private val FOREGROUND_CHANNEL = "com.adhocx.app/foreground"
    private val OVERLAY_ENGINE_CACHE_ID = "myCachedEngine"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Modern Android 15+ edge-to-edge compatibility
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }

    override fun onResume() {
        super.onResume()
        // Also ensure the cached overlay isolate engine has the foreground channel bound
        attachChannelToOverlayEngineIfPresent()
    }

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        attachForegroundChannel(flutterEngine)
        attachChannelToOverlayEngineIfPresent()
    }

    private fun attachChannelToOverlayEngineIfPresent() {
        try {
            val overlayEngine = FlutterEngineCache.getInstance().get(OVERLAY_ENGINE_CACHE_ID)
            if (overlayEngine != null) {
                attachForegroundChannel(overlayEngine)
            }
        } catch (_: Exception) {
            // Overlay engine may not be initialized yet
        }
    }

    private fun attachForegroundChannel(flutterEngine: FlutterEngine) {
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, FOREGROUND_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "bringToFront" -> {
                    try {
                        val intent = Intent(applicationContext, MainActivity::class.java).apply {
                            action = Intent.ACTION_MAIN
                            addCategory(Intent.CATEGORY_LAUNCHER)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        }
                        applicationContext.startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("ERROR", e.localizedMessage, null)
                    }
                }
                "closeOverlayService" -> {
                    try {
                        val serviceClass = Class.forName("flutter.overlay.window.flutter_overlay_window.OverlayService")
                        val stopIntent = Intent(applicationContext, serviceClass)
                        applicationContext.stopService(stopIntent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "checkPlayStoreUpdate" -> {
                    try {
                        val appUpdateManager = AppUpdateManagerFactory.create(applicationContext)
                        val infoTask = appUpdateManager.appUpdateInfo
                        infoTask.addOnSuccessListener { info ->
                            val isAvailable =
                                info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE ||
                                info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
                            val payload = hashMapOf<String, Any?>(
                                "updateAvailable" to isAvailable,
                                "availableVersionCode" to info.availableVersionCode(),
                                "immediateAllowed" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
                                "flexibleAllowed" to info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
                                "stalenessDays" to info.clientVersionStalenessDays()
                            )
                            result.success(payload)
                        }.addOnFailureListener {
                            result.success(
                                hashMapOf<String, Any?>(
                                    "updateAvailable" to false,
                                    "availableVersionCode" to 0
                                )
                            )
                        }
                    } catch (_: Exception) {
                        result.success(
                            hashMapOf<String, Any?>(
                                "updateAvailable" to false,
                                "availableVersionCode" to 0
                            )
                        )
                    }
                }
                "openPlayStore" -> {
                    try {
                        val marketIntent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("market://details?id=$packageName")
                        ).apply {
                            setPackage("com.android.vending")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        applicationContext.startActivity(marketIntent)
                        result.success(true)
                    } catch (_: Exception) {
                        try {
                            val fallbackIntent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("https://play.google.com/store/apps/details?id=$packageName")
                            ).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            applicationContext.startActivity(fallbackIntent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("PLAY_STORE_ERROR", e.localizedMessage, null)
                        }
                    }
                }
                "batteryLevel" -> {
                    // Corporate ETS telemetry / SOS: device battery 0-100 (null when unavailable).
                    try {
                        val bm = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                        result.success(if (level in 0..100) level else null)
                    } catch (e: Exception) {
                        result.success(null)
                    }
                }
                "canDrawOverlays" -> {
                    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Settings.canDrawOverlays(applicationContext)
                    } else {
                        true
                    }
                    result.success(granted)
                }
                "openOverlaySettings" -> {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                        result.success(true)
                        return@setMethodCallHandler
                    }
                    try {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
                        startActivity(intent)
                        result.success(true)
                    } catch (_: Exception) {
                        try {
                            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))
                            result.success(true)
                        } catch (_: Exception) {
                            try {
                                val appIntent = Intent(
                                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                    Uri.parse("package:$packageName")
                                )
                                startActivity(appIntent)
                                result.success(true)
                            } catch (e: Exception) {
                                result.error("OVERLAY_SETTINGS_ERROR", e.localizedMessage, null)
                            }
                        }
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}
