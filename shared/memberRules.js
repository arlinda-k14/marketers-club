// Validation and shaping rules for member profiles and Hire Marketers listings.
// Shared by the local Express server (server/routes) and the browser data layer that talks to
// Firestore on the live site (src/services/api.js), so both enforce the same rules.
// Firestore security rules (firestore.rules) enforce the parts that matter for safety.

const QUAL_TYPES = ['degree', 'certification', 'role'];
const LINK_KEYS = ['website', 'github', 'linkedin', 'newsletter'];

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

// Returns { data } with only known, cleaned fields, or { errors } keyed by field.
function cleanProfile(body) {
  const errors = {};
  const fullName = str(body.fullName, 80);
  if (!fullName) errors.fullName = 'Add your name.';

  const seen = new Set();
  const skills = (Array.isArray(body.skills) ? body.skills : [])
    .map(s => str(s, 40))
    .filter(s => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 20);

  const qualifications = (Array.isArray(body.qualifications) ? body.qualifications : [])
    .map(q => ({
      type: QUAL_TYPES.includes(q && q.type) ? q.type : 'certification',
      title: str(q && q.title, 120),
      organization: str(q && q.organization, 120),
      period: str(q && q.period, 40)
    }))
    .filter(q => q.title)
    .slice(0, 20);

  const links = {};
  for (const key of LINK_KEYS) {
    const v = str(body.links && body.links[key], 300);
    if (v && !isHttpUrl(v)) errors['links.' + key] = 'Use a full link starting with https://';
    links[key] = v;
  }

  if (Object.keys(errors).length) return { errors };
  return {
    data: {
      fullName,
      displayName: fullName,
      currentRole: str(body.currentRole, 120),
      bio: str(body.bio, 1200),
      skills,
      qualifications,
      links
    }
  };
}

function publicProfile(uid, u) {
  return {
    uid,
    fullName: u.fullName || u.displayName || '',
    currentRole: u.currentRole || '',
    bio: u.bio || '',
    skills: u.skills || [],
    qualifications: u.qualifications || [],
    links: { website: '', github: '', linkedin: '', newsletter: '', ...(u.links || {}) },
    avatar: u.avatar || '',
    membershipTier: u.membershipTier || 'free',
    email: u.email || ''
  };
}


// Match the directory's specialty filters (hire-marketers.html) so listings are findable.
const SPECIALTIES = ['performance marketing', 'content', 'SEO', 'marketing analytics', 'ad copywriting', 'AI tools', 'brand strategy', 'creative direction'];
const RATE_TYPES = ['hourly', 'monthly', 'project'];

function numOrNull(v, max) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : NaN;
}

function cleanListing(body) {
  const errors = {};
  const role = str(body.role, 120);
  if (!role) errors.role = 'Add the title clients will see.';
  const specialties = (Array.isArray(body.specialties) ? body.specialties : []).filter(s => SPECIALTIES.includes(s)).slice(0, 6);
  if (!specialties.length) errors.specialties = 'Pick at least one specialty.';
  const yearsExperience = numOrNull(body.yearsExperience, 60);
  if (Number.isNaN(yearsExperience)) errors.yearsExperience = 'Use a number from 0 to 60.';
  const rateMin = numOrNull(body.rateMin, 100000);
  const rateMax = numOrNull(body.rateMax, 100000);
  if (Number.isNaN(rateMin)) errors.rateMin = 'Use a whole number.';
  if (Number.isNaN(rateMax)) errors.rateMax = 'Use a whole number.';
  if (!errors.rateMin && !errors.rateMax && (rateMin === null) !== (rateMax === null)) errors.rateMax = 'Add both ends of the range, or leave both empty.';
  if (!errors.rateMin && !errors.rateMax && rateMin !== null && rateMin > rateMax) errors.rateMax = 'The maximum must be at least the minimum.';
  const rateType = RATE_TYPES.includes(body.rateType) ? body.rateType : 'hourly';
  const email = str(body.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Add an email clients can reach you at.';
  if (Object.keys(errors).length) return { errors };
  return { data: { role, specialties, yearsExperience, rateMin, rateMax, rateType, email } };
}

// Directory fields that come from the member's profile, so the two never drift apart.
function listingFromProfile(u) {
  const links = u.links || {};
  return {
    fullName: u.fullName || u.displayName || '',
    avatar: u.avatar || '',
    bio: u.bio || '',
    website: links.website || '',
    linkedin: links.linkedin || '',
    portfolioLinks: [links.website, links.github, links.newsletter].filter(Boolean)
  };
}

function publicListing(l) {
  if (!l) return null;
  return {
    status: l.status || 'approved', role: l.role || '', specialties: l.specialties || [],
    yearsExperience: l.yearsExperience ?? null, rateMin: l.rateMin ?? null, rateMax: l.rateMax ?? null,
    rateType: l.rateType || 'hourly', email: l.email || '', verified: !!l.verified
  };
}

function calcCompletionScore(profile) {
  const required = ['fullName', 'bio', 'yearsExperience', 'rateMin', 'rateMax', 'specialties', 'portfolioLinks', 'email'];
  let filled = 0;
  for (const f of required) {
    const v = profile[f];
    if (Array.isArray(v)) {
      if (v.length > 0) filled++;
    } else if (v !== undefined && v !== null && v !== '') {
      filled++;
    }
  }
  return Math.round((filled / required.length) * 100);
}

module.exports = {
  QUAL_TYPES, LINK_KEYS, SPECIALTIES, RATE_TYPES,
  str, isHttpUrl, cleanProfile, publicProfile,
  cleanListing, listingFromProfile, publicListing, calcCompletionScore
};
