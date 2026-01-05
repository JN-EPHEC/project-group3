// register.js
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js"; // On récupère les instances initialisées

// Constantes
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

// Fonction principale d'inscription
export async function handleSignUp(email, password, nom, prenom) {
    
    // A. Validation
    if (!nom || !prenom) throw new Error("Nom et prénom requis.");
    if (!PASSWORD_REGEX.test(password)) {
        throw new Error("Le mot de passe ne respecte pas les critères de sécurité.");
    }

    try {
        // B. Création Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Envoi de l'email de vérification
        try {
            await sendEmailVerification(user);
            console.log('✅ Email de vérification envoyé à:', email);
        } catch (emailError) {
            console.error('❌ Erreur lors de l\'envoi de l\'email de vérification:', emailError.message);
        }

        // C. Stockage Firestore
        await setDoc(doc(db, "users", user.uid), {
            firstName: prenom,
            lastName: nom,
            email: email,
            role: "user",
            createdAt: new Date().toISOString()
        });

        return user;
    } catch (error) {
        throw error;
    }
}