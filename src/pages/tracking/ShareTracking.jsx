import { useSearchParams } from "react-router";
import RideTracking from "./RideTracking";
import CarpoolShare from "./CarpoolShare";

/** /share — ride: normal ride query; carpool: ?carpool=…&passengerId=… (RideTracking file untouched). */
export default function ShareTracking() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("carpool")) {
    return <CarpoolShare />;
  }
  return <RideTracking />;
}
