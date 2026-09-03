/** Build full rejected-doc rows (key + rejectReason + doc) for resubmit navigation + form prefill */

const userDocByKey = (user, key) => {
  if (!user) return null;
  const map = {
    driverLicense: user.driverLicense,
    vehicleRegistration: user.vehicleRegistration,
    insurance: user.insurance,
    vehicleDetails: user.vehicleDetails,
  };
  return map[key] || null;
};

export function mergeRejectedDocumentsForResubmit(rejectedFlow, {
  rejectedDocsFromState = [],
  rejectedDocumentsRedux = [],
  apiRejectedDocuments = [],
  user,
}) {
  if (!Array.isArray(rejectedFlow) || rejectedFlow.length === 0) return [];

  const findInLists = (key) => {
    const a = (rejectedDocsFromState || []).find((d) => d?.key === key);
    if (a) return { ...a };
    const b = (rejectedDocumentsRedux || []).find((d) => d?.key === key);
    if (b) return { ...b };
    const c = (apiRejectedDocuments || []).find((d) => d?.key === key);
    if (c) return { ...c };
    return null;
  };

  return rejectedFlow.map((key) => {
    const fromLists = findInLists(key);
    const userDoc = userDocByKey(user, key);
    const doc = fromLists?.doc || userDoc;
    return {
      key,
      rejectReason: fromLists?.rejectReason || doc?.rejectReason || userDoc?.rejectReason || '',
      ...(doc && typeof doc === "object" ? { doc } : {}),
    };
  });
}

/**
 * Find the rejected document to prefill a step from, newest source first.
 *
 * Router state is only present when the user clicked Resubmit in this tab; after a reload it
 * is gone, which is why the redux copy (filled by the account-status call) and the user object
 * are checked as well. Only ever returns a *rejected* document — a pending or approved one
 * must not be reopened for editing.
 */
export function resolveRejectedDocForKey(key, {
  rejectedDocsFromState = [],
  rejectedDocumentsRedux = [],
  user,
} = {}) {
  const fromState = (rejectedDocsFromState || []).find((d) => d?.key === key)?.doc;
  if (fromState && typeof fromState === 'object') return fromState;

  const fromRedux = (rejectedDocumentsRedux || []).find((d) => d?.key === key)?.doc;
  if (fromRedux && typeof fromRedux === 'object') return fromRedux;

  const fromUser = user?.[key];
  if (fromUser && typeof fromUser === 'object' && fromUser.status === 'rejected') {
    return fromUser;
  }

  return null;
}

/** Fetch remote image URL as File for re-upload (S3 must allow CORS). */
export async function fetchUrlAsFile(url, baseName = "image") {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = (blob.type || "").includes("png") ? "png" : "jpg";
    return new File([blob], `${baseName}.${ext}`, { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}
