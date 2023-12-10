import { SerializedContinueConfig } from "core/config/index";
import { IDE } from "core/ide/types";
import * as fs from "fs";
import * as vscode from "vscode";
import { ideProtocolClient } from "./activation/activate";
import {
  getConfigJsonPath,
  getContinueGlobalPath,
} from "./activation/environmentSetup";

class VsCodeIde implements IDE {
  async getSerializedConfig(): Promise<SerializedContinueConfig> {
    const configPath = getConfigJsonPath();
    let contents = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(contents) as SerializedContinueConfig;
    config.allowAnonymousTelemetry =
      config.allowAnonymousTelemetry &&
      vscode.workspace.getConfiguration("continue").get("telemetryEnabled");

    // Migrate to camelCase - replace all instances of "snake_case" with "camelCase"
    contents = contents.replace(/(_\w)/g, function (m) {
      return m[1].toUpperCase();
    });
    fs.writeFileSync(configPath, contents, "utf8");

    return config;
  }

  async getDiff(): Promise<string> {
    return await ideProtocolClient.getDiff();
  }

  async getTerminalContents(): Promise<string> {
    return await ideProtocolClient.getTerminalContents(2);
  }

  async listWorkspaceContents(): Promise<string[]> {
    return await ideProtocolClient.getDirectoryContents(
      ideProtocolClient.getWorkspaceDirectory(),
      true
    );
  }

  async getWorkspaceDir(): Promise<string> {
    return ideProtocolClient.getWorkspaceDirectory();
  }

  async getContinueDir(): Promise<string> {
    return getContinueGlobalPath();
  }

  async writeFile(path: string, contents: string): Promise<void> {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(path),
      Buffer.from(contents)
    );
  }

  async showVirtualFile(title: string, contents: string): Promise<void> {
    ideProtocolClient.showVirtualFile(title, contents);
  }

  async openFile(path: string): Promise<void> {
    ideProtocolClient.openFile(path);
  }

  async runCommand(command: string): Promise<void> {
    await ideProtocolClient.runCommand(command);
  }
}

export default VsCodeIde;
