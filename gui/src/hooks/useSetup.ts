import { Dispatch } from "@reduxjs/toolkit";
import ContinueGUIClientProtocol from "./ContinueGUIClientProtocol";
import { useEffect } from "react";
import { processSessionUpdate } from "../redux/slices/sessionStateReducer";
import {
  setHighlightedCode,
  setServerStatusMessage,
} from "../redux/slices/miscSlice";
import { postVscMessage } from "../vscode";
import { useSelector } from "react-redux";
import { RootStore } from "../redux/store";
import {
  setContextProviders,
  setSlashCommands,
} from "../redux/slices/serverStateReducer";

async function clientSetup(
  client: ContinueGUIClientProtocol,
  dispatch: Dispatch<any>,
  serverUrl: string
) {
  // Listen for updates to the session state
  client.onSessionUpdate((update) => {
    console.log(update);
    dispatch(processSessionUpdate(update));
  });

  fetch(`${serverUrl}/slash_commands`).then(async (resp) => {
    const sc = await resp.json();
    console.log(sc);
    dispatch(setSlashCommands(sc));
  });
  fetch(`${serverUrl}/context_providers`).then(async (resp) => {
    const cp = await resp.json();
    console.log(cp);
    dispatch(setContextProviders(cp));
  });
}

function useSetup(
  client: ContinueGUIClientProtocol | undefined,
  dispatch: Dispatch<any>
) {
  const serverUrl = useSelector((store: RootStore) => store.config.apiUrl);

  // Setup requiring client
  useEffect(() => {
    if (!client) return;

    clientSetup(client, dispatch, serverUrl);
  }, [client]);

  // IDE event listeners
  useEffect(() => {
    const eventListener = (event: any) => {
      switch (event.data.type) {
        case "highlightedCode":
          dispatch(setHighlightedCode(event.data.rangeInFile));
          break;
        case "serverStatus":
          dispatch(setServerStatusMessage(event.data.message));
          break;
      }
    };
    window.addEventListener("message", eventListener);
    postVscMessage("onLoad", {});
    return () => window.removeEventListener("message", eventListener);
  }, []);

  // Save theme colors to local storage
  useEffect(() => {
    if (document.body.style.getPropertyValue("--vscode-editor-foreground")) {
      localStorage.setItem(
        "--vscode-editor-foreground",
        document.body.style.getPropertyValue("--vscode-editor-foreground")
      );
    }
    if (document.body.style.getPropertyValue("--vscode-editor-background")) {
      localStorage.setItem(
        "--vscode-editor-background",
        document.body.style.getPropertyValue("--vscode-editor-background")
      );
    }
    if (document.body.style.getPropertyValue("--vscode-list-hoverBackground")) {
      localStorage.setItem(
        "--vscode-list-hoverBackground",
        document.body.style.getPropertyValue("--vscode-list-hoverBackground")
      );
    }
  }, []);
}

export default useSetup;
