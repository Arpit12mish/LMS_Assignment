# ERROR  
expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go. Read more at https://docs.expo.dev/develop/development-builds/introduction/.
# WARN  
`expo-notifications` functionality is not fully supported in Expo Go:
We recommend you instead use a development build to avoid limitations. Learn more: https://expo.fyi/dev-client.

# Solution 
Expo Go (SDK ≥53) no longer supports remote push on Android. That message is not a crash—it's just telling you: “push = not supported in Expo Go.”
Local notifications still work in Expo Go. Our code uses local notifications only, so you can ignore the warning.