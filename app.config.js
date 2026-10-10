module.exports = () => {
  const target = process.env.APP_TARGET || process.env.EXPO_PUBLIC_APP_TARGET || 'student';
  const isTeacher = target === 'teacher';

  // EAS Build only uploads files tracked by git, and google-services.json is
  // deliberately gitignored. The Google Services Gradle plugin hard-fails
  // without it, so a build either needs the file present or needs the
  // reference removed. Set SKIP_FIREBASE=1 to build without Firebase; unset it
  // (or pass a real google-services.json) when push notifications are needed.
  const skipFirebase = process.env.SKIP_FIREBASE === '1';

  return {
    name: isTeacher ? 'Sohoj Shikkhok' : 'Sohoj Pathshala',
    // slug MUST stay constant across both targets. EAS binds one projectId to
    // one slug; flipping the slug to 'sohoj-shikkhok' made the build fail with
    // "slug does not match extra.eas.projectId". The two apps are still
    // distinct on a device via `name`, `scheme` and `android.package`.
    slug: 'sohoj-pathshala',
    scheme: isTeacher ? 'sohojshikkhok' : 'sohojpathshala',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#C2703D',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: isTeacher
        ? 'com.sohojpathshala.teacher'
        : 'com.sohojpathshala.student',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundColor: '#C2703D',
      },
      package: isTeacher
        ? 'com.sohojpathshala.teacher'
        : 'com.sohojpathshala.student',
      ...(skipFirebase ? {} : { googleServicesFile: './google-services.json' }),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-splash-screen',
    ],
    extra: {
      appTarget: target,
      eas: {
        projectId: "2ce5b0cd-4cc4-47e8-a2ee-073000e4a050",
      },
    },
  };
};
