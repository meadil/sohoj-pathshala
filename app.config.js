module.exports = () => {
  const target = process.env.APP_TARGET || 'student';
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
      backgroundColor: '#FBF7F0',
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
        backgroundColor: '#FBF7F0',
      },
      package: isTeacher
        ? 'com.sohojpathshala.teacher'
        : 'com.sohojpathshala.student',
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
    },
  };
};
