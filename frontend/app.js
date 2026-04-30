import { IconSprite } from "/components/icons.js";
import { startRouter } from "/router.js";

document.body.insertAdjacentHTML("afterbegin", IconSprite());
startRouter(document.querySelector("#app"));
