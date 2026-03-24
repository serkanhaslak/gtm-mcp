import { accountActions } from "./accountActions.js";
import { builtInVariableActions } from "./builtInVariableActions.js";
import { clientActions } from "./clientActions.js";
import { containerActions } from "./containerActions.js";
import { destinationActions } from "./destinationActions.js";
import { environmentActions } from "./environmentActions.js";
import { folderActions } from "./folderActions.js";
import { gtagConfigActions } from "./gtagConfigActions.js";
import { removeMCPServerData } from "./removeMCPServerData.js";
import { tagActions } from "./tagActions.js";
import { templateActions } from "./templateActions.js";
import { transformationActions } from "./transformationActions.js";
import { triggerActions } from "./triggerActions.js";
import { userPermissionActions } from "./userPermissionActions.js";
import { variableActions } from "./variableActions.js";
import { versionHeaderActions } from "./versionHeaderActions.js";
import { versionActions } from "./versionActions.js";
import { workspaceActions } from "./workspaceActions.js";
import { zoneActions } from "./zoneActions.js";

export const tools = [
  accountActions,
  builtInVariableActions,
  clientActions,
  containerActions,
  destinationActions,
  environmentActions,
  folderActions,
  gtagConfigActions,
  tagActions,
  templateActions,
  transformationActions,
  triggerActions,
  userPermissionActions,
  variableActions,
  versionHeaderActions,
  versionActions,
  workspaceActions,
  zoneActions,
  removeMCPServerData,
];
