// Vary · landing page : inscription à la liste d'attente.
//
// Les emails sont envoyés dans la table `waitlist` du projet Supabase « vary ».
// La clé ci-dessous est une clé PUBLIABLE : elle est faite pour être visible dans le
// navigateur. La sécurité vient des règles de la table (RLS) : le site peut seulement
// AJOUTER une inscription, jamais lire, modifier ou supprimer la liste.
const SUPABASE_URL = "https://fjegyoaqkgsdrfyrmxxx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_drxF49pDfSKSCFCX9rZOmw_zdyWcGI8";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Anti-robots : un humain met plus de 3 secondes à remplir le formulaire,
// et ne voit pas le champ piège « website ».
const MIN_FILL_MS = 3000;
const pageLoadedAt = Date.now();

function looksLikeBot(form) {
  const trap = form.querySelector('input[name="website"]');
  return (trap && trap.value !== "") || Date.now() - pageLoadedAt < MIN_FILL_MS;
}

function setMessage(form, text, kind) {
  const msg = form.querySelector(".signup__msg");
  msg.textContent = text;
  msg.classList.toggle("is-error", kind === "error");
  msg.classList.toggle("is-ok", kind === "ok");
}

async function subscribe({ email, sector }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, sector: sector || null, consent: true }),
  });
  // 201 = inscrit ; 409 = déjà inscrit (on le traite comme un succès).
  if (res.status === 201 || res.status === 409) return;
  throw new Error(`Réponse inattendue : ${res.status}`);
}

document.querySelectorAll("form.signup").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    const consentInput = form.querySelector('input[name="consent"]');
    const sectorInput = form.querySelector('select[name="sector"]');
    const button = form.querySelector('button[type="submit"]');

    const email = emailInput.value.trim().toLowerCase();
    emailInput.setAttribute("aria-invalid", "false");

    if (!EMAIL_RE.test(email) || email.length > 254) {
      emailInput.setAttribute("aria-invalid", "true");
      emailInput.focus();
      setMessage(form, "Vérifie ton adresse email.", "error");
      return;
    }
    if (!consentInput.checked) {
      consentInput.focus();
      setMessage(form, "Coche la case pour qu'on puisse te prévenir au lancement.", "error");
      return;
    }

    // Robot détecté : on affiche le même message de succès, sans rien enregistrer,
    // pour ne pas lui indiquer qu'il a été repéré.
    if (looksLikeBot(form)) {
      form.classList.add("is-done");
      setMessage(form, "C'est noté ! Tu seras parmi les premiers prévenus au lancement de Vary.", "ok");
      return;
    }

    button.disabled = true;
    setMessage(form, "Inscription en cours…");

    try {
      await subscribe({ email, sector: sectorInput ? sectorInput.value : "" });
      form.classList.add("is-done");
      setMessage(form, "C'est noté ! Tu seras parmi les premiers prévenus au lancement de Vary.", "ok");
    } catch (error) {
      console.error(error);
      setMessage(form, "Oups, l'inscription n'a pas fonctionné. Réessaie dans un instant.", "error");
    } finally {
      button.disabled = false;
    }
  });
});
