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
    const b = (rejectedDocumentsRedux || []).find((d) => (typeof d === 'string' ? d === key : d?.key === key));
    if (b) return typeof b === 'string' ? { key: b } : { ...b };
    const a = (rejectedDocsFromState || []).find((d) => (typeof d === 'string' ? d === key : d?.key === key));
    if (a) return typeof a === 'string' ? { key: a } : { ...a };
    const c = (apiRejectedDocuments || []).find((d) => (typeof d === 'string' ? d === key : d?.key === key));
    if (c) return typeof c === 'string' ? { key: c } : { ...c };
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
