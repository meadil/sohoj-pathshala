module.exports = () => {
  const target = process.env.APP_TARGET || process.env.EXPO_PUBLIC_APP_TARGET || 'student';
  const isTeacher = target === 'teacher';

  return {
    name: isTeacher ? 'Sohoj Shikkhok' : 'Sohoj Pathshala',
    slug: isTeacher ? 'sohoj-shikkhok' : 'sohoj-pathshala',
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
      googleServicesFile: './google-services.json',
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
