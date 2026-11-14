import Flutter
import GoogleMaps
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Same Maps key as AndroidManifest / LocationService; restrict it to the iOS bundle id in Cloud Console.
    GMSServices.provideAPIKey("AIzaSyB8uEHtGy96QPbx3eIxG0s0_WYlWpB8QVI")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
