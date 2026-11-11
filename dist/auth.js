import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getServices } from './services';
import { FamilleError } from './errors';
export async function signUp(email, password, displayName) {
    const name = displayName.trim();
    if (!name)
        throw new FamilleError('Saisissez votre prénom.');
    const { auth, db } = getServices();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, 'users', cred.user.uid), { displayName: name });
}
export async function signIn(email, password) {
    const { auth } = getServices();
    await signInWithEmailAndPassword(auth, email.trim(), password);
}
export async function signOutUser() {
    const { auth } = getServices();
    await signOut(auth);
}
export async function resetPassword(email) {
    const { auth } = getServices();
    await sendPasswordResetEmail(auth, email.trim());
}
