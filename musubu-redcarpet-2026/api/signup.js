import { register } from "../lib/signup.mjs";

export default {
  fetch(request) {
    return register(request);
  },
};
