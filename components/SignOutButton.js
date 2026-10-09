import React, { useState } from 'react';
import Button from './Button';
import { useAlert } from './CustomAlert';
import { useUser } from '../contexts/UserContext';

/**
 * askSignOut - shared confirm-then-sign-out flow.
 * Shows a confirm dialog; on confirm, signs out via UserContext
 * (supabase.auth.signOut + clears local session/profile). No explicit
 * navigation — the root guards (student/teacher) re-route to auth
 * automatically once the session clears.
 * Copy is provisional Bangla (not from a prototype — prototypes have
 * no sign-out confirm copy); flagged in STATUS.md.
 */
export async function askSignOut({ alert, signOut, isBn }) {
  return new Promise((resolve) => {
    alert(
      isBn ? 'সাইন আউট' : 'Sign out',
      isBn
        ? 'তুমি কি সত্যিই সাইন আউট করতে চাও?'
        : 'Are you sure you want to sign out?',
      [
        {
          text: isBn ? 'বাদ দাও' : 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: isBn ? 'সাইন আউট' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              resolve(true);
            } catch (err) {
              alert(
                isBn ? 'সাইন আউট হয়নি' : 'Could Not Sign Out',
                err?.message || 'Please try again.'
              );
              resolve(false);
            }
          },
        },
      ]
    );
  });
}

/**
 * SignOutButton - chunky confirm+sign-out button for standalone use
 * (auth screens, settings rows that want a full button).
 */
export default function SignOutButton({
  title,
  variant = 'ghost',
  size = 'md',
  style,
}) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { signOut } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  return (
    <Button
      title={title || (isBn ? 'সাইন আউট' : 'Sign out')}
      variant={variant}
      size={size}
      style={style}
      onPress={() => askSignOut({ alert, signOut, isBn })}
    />
  );
}
