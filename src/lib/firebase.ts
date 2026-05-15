import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export async function loginAsGuest(username: string) {
  const userCredential = await signInAnonymously(auth);
  await updateProfile(userCredential.user, { displayName: username });
  
  // Create user doc
  const userRef = doc(db, "users", userCredential.user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Generate a 5-char alphanumeric shortId
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortId = '';
    for(let i=0; i<5; i++) {
        shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await setDoc(userRef, {
      uid: userCredential.user.uid,
      displayName: username,
      shortId: shortId,
      isOnline: true,
      lastActive: Date.now(),
      createdAt: Date.now(),
      wins: 0
    });
  } else {
    await setDoc(userRef, {
      displayName: username,
      isOnline: true,
      lastActive: Date.now()
    }, { merge: true });
  }
  
  return userCredential.user;
}
