import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";
import YasiiLauncher from "./YasiiLauncher.jsx";

export default function YasiiEmbeddedEntry(props) {
  return <YasiiLauncher {...props} />;
}

export { EMBEDDED_SURFACE_IDS };
