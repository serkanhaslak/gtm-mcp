import { google } from "googleapis";
import { log } from "./log.js";
import { Props } from "./authorizeUtils.js";

type TagManagerClient = ReturnType<typeof google.tagmanager>;

export async function getTagManagerClient(
  props: Props,
): Promise<TagManagerClient> {
  const token = props.accessToken;

  if (props.expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= props.expiresAt) {
      throw new Error(
        "Access token expired. Please refresh your connection or re-authenticate.",
      );
    }
  }

  try {
    return google.tagmanager({
      version: "v2",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    log("Error creating Tag Manager client:", error);
    throw error;
  }
}
