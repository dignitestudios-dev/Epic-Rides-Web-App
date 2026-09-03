import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { fetchAccountStatus, hydrateAuthFromCookies } from '../redux/slices/auth.slice';

/**
 * Loads authoritative onboarding state (profile, document statuses, rejected/missing lists)
 * into redux on mount, and optionally keeps polling it.
 *
 * Every onboarding page calls this: router state is lost on reload, so this is what refills
 * a resubmit form and keeps step access honest after a browser refresh.
 *
 * @param {object}  [options]
 * @param {number}  [options.pollMs=0]   Poll interval in ms. 0 disables polling.
 * @param {boolean} [options.enabled=true]
 */
export const useAccountStatus = ({ pollMs = 0, enabled = true } = {}) => {
  const dispatch = useDispatch();
  const { user, rejectedDocuments, missingDocuments, stepToComplete, accountStatus } =
    useSelector((state) => state.auth);

  const driverId = user?._id;

  // Redux can be empty on a hard reload before persist/cookie hydration runs
  useEffect(() => {
    if (!enabled || driverId) return;
    if (Cookies.get('token') || Cookies.get('user')) {
      dispatch(hydrateAuthFromCookies());
    }
  }, [enabled, driverId, dispatch]);

  useEffect(() => {
    if (!enabled || !driverId) return undefined;

    dispatch(fetchAccountStatus({ driverId }));

    if (!pollMs) return undefined;

    const intervalId = setInterval(() => {
      dispatch(fetchAccountStatus({ driverId }));
    }, pollMs);

    return () => clearInterval(intervalId);
  }, [enabled, driverId, pollMs, dispatch]);

  return { user, rejectedDocuments, missingDocuments, stepToComplete, accountStatus };
};

export default useAccountStatus;
