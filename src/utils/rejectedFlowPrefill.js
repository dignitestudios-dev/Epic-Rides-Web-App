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
  user,
}) {
  if (!Array.isArray(rejectedFlow) || rejectedFlow.length === 0) return [];

  const findInLists = (key) => {
    const a = (rejectedDocsFromState || []).find((d) => d?.key === key);
    if (a) return { ...a };
    const b = (rejectedDocumentsRedux || []).find((d) => d?.key === key);
    if (b) return { ...b };
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
