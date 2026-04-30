import { startRouter } from "/router.js";
import { IconSprite } from "/components/icons.js";

if (!document.querySelector(".icon-sprite")) {
  document.body.insertAdjacentHTML("afterbegin", IconSprite());
}
startRouter(document.querySelector("#app"));
