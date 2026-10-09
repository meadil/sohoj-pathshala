import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [data, setData] = useState({
    email: '',
    phone: '',
    otp: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    avatarPreset: null,
    agreedToTerms: false,
    classLevelId: null,
    classLevelName: null,
    locationPermission: false,
    locationCoords: null,
    locationDistrict: null,
    onboardingComplete: false,
    schoolName: '',
  });

  const updateData = (fields) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const resetOnboarding = () => {
    setData({
      email: '',
      phone: '',
      otp: '',
      password: '',
      confirmPassword: '',
      name: '',
      nickname: '',
      avatarPreset: null,
      agreedToTerms: false,
      classLevelId: null,
      classLevelName: null,
      locationPermission: false,
      locationCoords: null,
      locationDistrict: null,
      onboardingComplete: false,
      schoolName: '',
    });
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
