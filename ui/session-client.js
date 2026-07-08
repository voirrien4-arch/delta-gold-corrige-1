// Delta Gold - Session client helper
// Mémorise (côté navigateur uniquement) le numéro de téléphone que CE visiteur
// a pairé, pour retrouver SA session au rechargement de la page. Chaque
// visiteur ne voit/contrôle que sa propre session.

const STORAGE_KEY = 'deltaGoldPhone';

export function getMyPhone() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setMyPhone(phone) {
  try {
    localStorage.setItem(STORAGE_KEY, phone);
  } catch {}
}

export function clearMyPhone() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
