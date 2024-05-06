import { ITool, ToolStep, matchString } from ".";

/// Tool for editing code
export default class ConfirmTool implements ITool {
  readonly name: string;
  readonly intent: string;
  readonly format: string;
  readonly prefix: string;
  readonly steps: ToolStep[];

  currentStep: number = 0;

  reset(): void {
    this.currentStep = 0;
  }

  getSuccessMessage(): string {
    return "Confirmed!";
  }

  constructor(request: string) {
    this.name = "confirm";
    this.intent = `confirm that "${request}" is done`;
    this.prefix = "1. I want to confirm";
    this.format = `1. I want to confirm that "${request}" is done.`;
    this.steps = [
      matchString("1.", `I want to confirm that "${request}" is done.`),
    ];
  }
}
