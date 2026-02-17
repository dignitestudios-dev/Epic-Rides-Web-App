import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
